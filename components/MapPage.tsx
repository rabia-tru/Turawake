import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet-routing-machine';
import { 
    BackIcon, 
    LocationMarkerIcon, 
    CarIcon, 
    XCircleIcon, 
    SwapIcon,
    BikeIcon,
    WalkIcon,
    BusIcon,
    NavigationArrowIcon,
    ShareIcon,
    BookmarkIcon,
    CheckCircleIcon
} from './icons';
import { Spinner } from './Spinner';

// Fix for Leaflet marker icons in React/Vite/Webpack environments
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Marker Icons as Data URLs
const DRIVER_ICON_B64 = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iIzQyODVGNCIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSIyIj48Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSIxMCIvPjxjaXJjbGUgY3g9IjEyIiBjeT0iMTIiIHI9IjQiIGZpbGw9IndoaXRlIi8+PC9zdmc+';
const DEST_ICON_B64 = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iI0VBNDMzNSI+PHBhdGggZD0iTTEyIDJDOC4xMyAyIDUgNS4xMyA1IDljMCA1LjI1IDcgMTMgNyAxM3M3LTcuNzUgNy0xM2MwLTMuODctMy4xMy03LTctN3ptMCA5LjVjLTEuMzggMC0yLjUtMS4xMi0yLjUtMi41czEuMTItMi41IDIuNS0yLjUgMi41IDEuMTIgMi41IDIuNS0xLjEyIDIuNS0yLjUgMi41eiIvPjwvc3ZnPg==';

const driverIcon = new L.Icon({
    iconUrl: DRIVER_ICON_B64,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12],
    className: 'driver-location-marker'
});

const destinationIcon = new L.Icon({
    iconUrl: DEST_ICON_B64,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
});

const formatDistance = (meters: number): string => {
    if (meters >= 1000) {
        return `${(meters / 1000).toFixed(1)} km`;
    }
    return `${Math.round(meters)} m`;
};

const formatTime = (seconds: number): string => {
    const minutes = Math.round(seconds / 60);
    if (minutes < 60) {
        return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours} hr ${remainingMinutes} min`;
};

interface MapPageProps {
    onBack: () => void;
}

interface RouteInstruction {
    text: string;
    distance: number;
    time: number;
    direction: string;
}

interface RouteInfo {
    distance: number;
    time: number;
    destination: string;
    coordinates: { lat: number; lng: number };
    instructions: RouteInstruction[];
}

interface SavedPlace {
    name: string;
    lat: number;
    lng: number;
    savedAt: number;
}

const MapPage: React.FC<MapPageProps> = ({ onBack }) => {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<L.Map | null>(null);
    const markerRef = useRef<L.Marker | null>(null);
    const routingControlRef = useRef<any>(null); // L.Routing.Control
    const positionRef = useRef<L.LatLng | null>(null);

    const [searching, setSearching] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [currentAddress, setCurrentAddress] = useState('Locating...');
    const [routeSummary, setRouteSummary] = useState<RouteInfo | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [notification, setNotification] = useState<string | null>(null);
    const [transportMode, setTransportMode] = useState<'car' | 'bike' | 'transit' | 'walk'>('bike');
    const [isSaved, setIsSaved] = useState(false);
    const [activeTab, setActiveTab] = useState<'details' | 'steps'>('details');

    useEffect(() => {
        if (routeSummary) {
            try {
                const savedPlaces: SavedPlace[] = JSON.parse(localStorage.getItem('truawake_saved_places') || '[]');
                const exists = savedPlaces.some(p => 
                    Math.abs(p.lat - routeSummary.coordinates.lat) < 0.0001 &&
                    Math.abs(p.lng - routeSummary.coordinates.lng) < 0.0001
                );
                setIsSaved(exists);
            } catch (e) {
                console.error("Error reading saved places", e);
            }
        } else {
            setIsSaved(false);
        }
    }, [routeSummary]);

    const showNotification = (msg: string) => {
        setNotification(msg);
        setTimeout(() => setNotification(null), 3000);
    };

    // Initialize Map
    useEffect(() => {
        if (!mapContainerRef.current || mapRef.current) return;
        
        // Ensure global L is available if needed by plugins loaded via script tag
        if (typeof window !== 'undefined') {
            (window as any).L = L;
        }

        const map = L.map(mapContainerRef.current, { 
            zoomControl: false,
            attributionControl: false 
        }).setView([31.5204, 74.3587], 13);
        
        mapRef.current = map;
        
        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
            attribution: 'OpenStreetMap',
            maxZoom: 20
        }).addTo(map);

        // Location found handler
        const onLocationFound = (e: L.LocationEvent) => {
            const latlng = e.latlng;
            positionRef.current = latlng;

            if (!markerRef.current) {
                // Initial find
                 markerRef.current = L.marker(latlng, { icon: driverIcon }).addTo(map);
                 map.setView(latlng, 15);
                 
                 // Reverse Geocode
                 fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latlng.lat}&lon=${latlng.lng}`)
                    .then(res => res.json())
                    .then(data => {
                        if (data && data.display_name) {
                            const parts = data.display_name.split(', ');
                            setCurrentAddress(parts[0] + (parts[1] ? `, ${parts[1]}` : ''));
                        }
                    })
                    .catch(() => setCurrentAddress("Your location"));
            } else {
                markerRef.current.setLatLng(latlng);
            }
        };

        map.on('locationfound', onLocationFound);
        map.locate({ watch: true, setView: false, enableHighAccuracy: true });

        return () => {
            if (mapRef.current) {
                mapRef.current.stopLocate();
                mapRef.current.remove();
                mapRef.current = null;
            }
        };
    }, []);

    const handleRecenter = () => {
        if (mapRef.current && positionRef.current) {
            mapRef.current.flyTo(positionRef.current, 16, { duration: 1 });
        }
    };

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchQuery.trim()) return;

        setSearching(true);
        setError(null);
        setRouteSummary(null);
        setActiveTab('details');
        
        // Remove existing route
        if (routingControlRef.current && mapRef.current) {
            try {
                mapRef.current.removeControl(routingControlRef.current);
            } catch (e) {}
            routingControlRef.current = null;
        }
        
        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`);
            if (!response.ok) throw new Error("Search failed");
            const results = await response.json();

            if (results && results.length > 0) {
                const result = results[0];
                const destLatLng = L.latLng(parseFloat(result.lat), parseFloat(result.lon));
                const destName = result.display_name.split(',')[0]; 
                
                if (positionRef.current && mapRef.current) {
                    const Routing = (L as any).Routing;
                    if (Routing) {
                        const control = Routing.control({
                            waypoints: [
                                positionRef.current,
                                destLatLng
                            ],
                            router: Routing.osrmv1({
                                serviceUrl: 'https://router.project-osrm.org/route/v1',
                                profile: 'driving'
                            }),
                            routeWhileDragging: false,
                            addWaypoints: false,
                            fitSelectedRoutes: true,
                            showAlternatives: false,
                            containerClassName: 'hidden-routing-container', // Hide default container
                            // *** BLUE LINE CONFIGURATION ***
                            lineOptions: {
                                styles: [
                                    { color: '#3b82f6', opacity: 0.8, weight: 6 } // Blue line
                                ],
                                extendToWaypoints: true,
                                missingRouteTolerance: 10
                            },
                            createMarker: (i: number, wp: any, n: number) => {
                                // Start marker is current location (custom), so only add Dest marker
                                if (i === n - 1) {
                                    return L.marker(wp.latLng, { icon: destinationIcon });
                                }
                                return null;
                            }
                        });

                        control.on('routesfound', (evt: any) => {
                            const routes = evt.routes;
                            if (routes.length > 0) {
                                const summary = routes[0].summary;
                                const instructions = routes[0].instructions.map((step: any) => ({
                                    text: step.text,
                                    distance: step.distance,
                                    time: step.time,
                                    direction: step.type,
                                }));

                                setRouteSummary({ 
                                    distance: summary.totalDistance, 
                                    time: summary.totalTime, 
                                    destination: destName,
                                    coordinates: { lat: destLatLng.lat, lng: destLatLng.lng },
                                    instructions: instructions
                                });
                            }
                        });

                        control.on('routingerror', (err: any) => {
                            console.error("Routing error", err);
                            setError("Could not calculate route.");
                        });

                        control.addTo(mapRef.current);
                        routingControlRef.current = control;
                    }
                } else {
                    setError("Current location not found yet.");
                }
            } else {
                setError("Location not found.");
            }
        } catch (err) {
            console.error(err);
            setError("Connection failed.");
        } finally {
            setSearching(false);
        }
    };

    const handleStartNavigation = () => {
        if (!routeSummary) return;
        const { lat, lng } = routeSummary.coordinates;
        window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`, '_blank');
    };
    
    const handleShare = async () => {
        if (!routeSummary) return;
        const { lat, lng } = routeSummary.coordinates;
        const shareData = {
            title: `Trip to ${routeSummary.destination}`,
            text: `I'm heading to ${routeSummary.destination}. Distance: ${formatDistance(routeSummary.distance)}`,
            url: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
        };
        if (navigator.share) {
            try { await navigator.share(shareData); } catch (err) {}
        } else {
            navigator.clipboard.writeText(shareData.url);
            showNotification("Link copied to clipboard");
        }
    };

    const handleSave = () => {
        if (!routeSummary) return;
        try {
            const savedPlaces: SavedPlace[] = JSON.parse(localStorage.getItem('truawake_saved_places') || '[]');
            if (isSaved) {
                const newPlaces = savedPlaces.filter(p => 
                    Math.abs(p.lat - routeSummary.coordinates.lat) >= 0.0001 ||
                    Math.abs(p.lng - routeSummary.coordinates.lng) >= 0.0001
                );
                localStorage.setItem('truawake_saved_places', JSON.stringify(newPlaces));
                setIsSaved(false);
                showNotification("Location removed from favorites");
            } else {
                const newPlace: SavedPlace = {
                    name: routeSummary.destination,
                    lat: routeSummary.coordinates.lat,
                    lng: routeSummary.coordinates.lng,
                    savedAt: Date.now()
                };
                savedPlaces.push(newPlace);
                localStorage.setItem('truawake_saved_places', JSON.stringify(savedPlaces));
                setIsSaved(true);
                showNotification("Location saved to favorites");
            }
        } catch (e) {
            console.error("Error saving place", e);
            showNotification("Failed to save location");
        }
    };

    const clearSearch = () => {
        setSearchQuery('');
        setRouteSummary(null);
        if (routingControlRef.current && mapRef.current) {
            try { mapRef.current.removeControl(routingControlRef.current); } catch(e) {}
            routingControlRef.current = null;
        }
        handleRecenter();
    };

    const getModeTime = (seconds: number, mode: string) => {
        let multiplier = 1;
        switch(mode) {
            case 'bike': multiplier = 0.8; break; 
            case 'transit': multiplier = 1.4; break;
            case 'walk': multiplier = 10; break;
            default: multiplier = 1;
        }
        return formatTime(seconds * multiplier);
    };

    return (
        <div className="h-full w-full flex flex-col relative bg-white text-slate-800 font-sans overflow-hidden">
            
            {/* --- Top Input Card --- */}
            <div className="absolute top-4 left-4 right-4 z-[1000] flex gap-2">
                <button 
                    onClick={onBack} 
                    className="flex-none w-10 h-10 bg-white rounded-full shadow-md text-slate-500 hover:text-slate-800 flex items-center justify-center border border-slate-100"
                >
                     <BackIcon className="w-5 h-5" />
                </button>
                
                <div className="flex-grow bg-white rounded-xl shadow-md border border-slate-100 p-3">
                    <div className="flex items-start gap-3 relative">
                        {/* Timeline Visual (Dots) */}
                        <div className="flex flex-col items-center pt-2 pl-1 gap-1">
                             <div className="w-4 h-4 rounded-full border-[3px] border-blue-600 bg-white shadow-sm"></div>
                             <div className="flex flex-col gap-1 py-1 h-8 justify-center">
                                <div className="w-1 h-1 rounded-full bg-slate-300"></div>
                                <div className="w-1 h-1 rounded-full bg-slate-300"></div>
                                <div className="w-1 h-1 rounded-full bg-slate-300"></div>
                             </div>
                             <div className="w-4 h-4 text-red-500">
                                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
                             </div>
                        </div>
                        
                        {/* Inputs */}
                        <div className="flex-grow flex flex-col gap-2">
                             <div className="relative h-10 flex items-center bg-slate-50 rounded-lg px-3 border border-slate-100 focus-within:ring-2 focus-within:ring-blue-100 focus-within:border-blue-300 transition-all">
                                 <input 
                                     type="text" 
                                     value={currentAddress}
                                     readOnly
                                     className="w-full bg-transparent text-slate-700 font-medium text-sm border-none focus:ring-0 cursor-default truncate pr-8"
                                 />
                                 <button
                                    onClick={handleRecenter}
                                    className="absolute right-2 p-1 text-slate-400 hover:text-blue-600 rounded-full hover:bg-blue-50 transition-colors"
                                    title="Use Current GPS Location"
                                 >
                                    <div className="w-4 h-4 border-2 border-current rounded-full flex items-center justify-center">
                                        <div className="w-1 h-1 bg-current rounded-full"></div>
                                    </div>
                                 </button>
                             </div>
                             <form onSubmit={handleSearch} className="relative h-10 flex items-center bg-slate-50 rounded-lg px-3 border border-slate-100 focus-within:ring-2 focus-within:ring-blue-100 focus-within:border-blue-300 transition-all">
                                 <input 
                                     type="text" 
                                     value={searchQuery}
                                     onChange={(e) => setSearchQuery(e.target.value)}
                                     placeholder="Choose destination"
                                     className="w-full bg-transparent text-slate-900 font-medium text-sm border-none focus:ring-0 placeholder-slate-400"
                                 />
                                 {searchQuery && (
                                     <button type="button" onClick={clearSearch} className="absolute right-2 text-slate-400 hover:text-slate-600">
                                         <XCircleIcon className="w-5 h-5" />
                                     </button>
                                 )}
                                 {searching && <div className="absolute right-2"><Spinner size="sm"/></div>}
                             </form>
                        </div>

                        {/* Right Actions */}
                        <div className="flex flex-col items-center justify-center gap-2 pt-2 h-full">
                             <button className="p-2 text-slate-400 hover:text-blue-600 hover:bg-slate-50 rounded-full transition-colors"><SwapIcon className="w-6 h-6"/></button>
                        </div>
                    </div>
                </div>
            </div>
            
            {/* --- Notifications / Errors --- */}
            {error && (
                <div className="absolute top-48 left-4 right-4 z-[900] bg-red-500 text-white p-3 rounded-lg shadow-lg text-sm flex items-center justify-between animate-fade-in-up">
                    <span>{error}</span>
                    <button onClick={() => setError(null)}><XCircleIcon className="w-5 h-5 opacity-80"/></button>
                </div>
            )}
            
            {notification && (
                <div className="absolute top-48 left-4 right-4 z-[900] bg-slate-800 text-white p-3 rounded-lg shadow-lg text-sm flex items-center justify-center animate-fade-in-up">
                    <CheckCircleIcon className="w-5 h-5 text-green-400 mr-2"/>
                    <span>{notification}</span>
                </div>
            )}

            {/* --- Map --- */}
            <div ref={mapContainerRef} className="flex-grow w-full h-full z-0 bg-slate-100" id="map"></div>
            
            {/* --- Recenter Button --- */}
            <button 
                onClick={handleRecenter} 
                className={`absolute right-4 z-[900] bg-white p-3 rounded-full shadow-lg border border-slate-100 text-blue-600 transition active:scale-95 ${routeSummary ? 'bottom-72' : 'bottom-8'}`}
            >
                <LocationMarkerIcon className="w-6 h-6" />
            </button>

            {/* --- Bottom Sheet --- */}
            <div className={`absolute bottom-0 left-0 right-0 z-[1000] bg-white rounded-t-3xl shadow-[0_-5px_30px_rgba(0,0,0,0.15)] transition-transform duration-300 ease-in-out ${routeSummary ? 'translate-y-0' : 'translate-y-full'}`} style={{ maxHeight: '80%' }}>
                {routeSummary && (
                    <div className="flex flex-col h-full">
                        {/* Drag Handle */}
                        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
                            <div className="w-10 h-1 bg-slate-300 rounded-full"></div>
                        </div>

                        {/* Tabs */}
                        <div className="flex px-6 mt-2 mb-2 border-b border-slate-100 flex-shrink-0">
                            <button 
                                onClick={() => setActiveTab('details')} 
                                className={`pb-2 pr-4 font-bold text-sm transition-colors ${activeTab === 'details' ? 'text-teal-700 border-b-2 border-teal-700' : 'text-slate-400'}`}
                            >
                                Overview
                            </button>
                            <button 
                                onClick={() => setActiveTab('steps')} 
                                className={`pb-2 pl-4 font-bold text-sm transition-colors ${activeTab === 'steps' ? 'text-teal-700 border-b-2 border-teal-700' : 'text-slate-400'}`}
                            >
                                Steps
                            </button>
                        </div>

                        {activeTab === 'details' ? (
                            <div className="overflow-y-auto pb-6">
                                {/* Transport Modes Tab Bar */}
                                <div className="flex justify-between px-4 pb-2 border-b border-slate-100 mt-2">
                                    {[
                                        { id: 'car', label: 'Car', icon: <CarIcon className="w-6 h-6"/>, time: formatTime(routeSummary.time) },
                                        { id: 'bike', label: 'Two-wheeler', icon: <BikeIcon className="w-6 h-6"/>, time: getModeTime(routeSummary.time, 'bike') },
                                        { id: 'transit', label: 'Transit', icon: <BusIcon className="w-6 h-6"/>, time: getModeTime(routeSummary.time, 'transit') },
                                        { id: 'walk', label: 'Walk', icon: <WalkIcon className="w-6 h-6"/>, time: getModeTime(routeSummary.time, 'walk') }
                                    ].map((mode) => (
                                        <button 
                                            key={mode.id}
                                            onClick={() => setTransportMode(mode.id as any)}
                                            className={`relative flex-1 flex flex-col items-center py-2 rounded-xl transition-all ${transportMode === mode.id ? 'text-teal-700' : 'text-slate-400'}`}
                                        >
                                            <div className={`p-1.5 rounded-full mb-1 transition-transform ${transportMode === mode.id ? 'scale-110' : ''}`}>
                                                {mode.icon}
                                            </div>
                                            <span className="text-[10px] font-bold whitespace-nowrap">{mode.time.split(' ')[0] + (mode.time.includes('hr') ? ' hr' : ' min')}</span>
                                            {transportMode === mode.id && <div className="absolute bottom-0 w-full h-0.5 bg-teal-700 rounded-t-full"></div>}
                                        </button>
                                    ))}
                                </div>

                                {/* Trip Info Details */}
                                <div className="px-6 pt-5 pb-3">
                                     <div className="flex items-baseline gap-2 mb-1">
                                        <h1 className="text-2xl font-bold text-teal-700">
                                            {getModeTime(routeSummary.time, transportMode)}
                                        </h1>
                                        <span className="text-lg text-slate-500 font-medium">
                                            ({formatDistance(routeSummary.distance)})
                                        </span>
                                     </div>
                                     <p className="text-slate-500 text-sm flex items-center gap-1">
                                         <span className="w-2 h-2 rounded-full bg-green-500 inline-block"></span>
                                         Fastest route now due to traffic conditions
                                     </p>
                                </div>
                            </div>
                        ) : (
                            <div className="overflow-y-auto px-6 py-4 max-h-[40vh] custom-scrollbar">
                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Turn-by-Turn</h3>
                                <div className="space-y-4 relative">
                                    <div className="absolute top-2 bottom-2 left-[11px] w-0.5 bg-slate-200"></div>
                                    {routeSummary.instructions.map((step, idx) => (
                                        <div key={idx} className="flex gap-4 relative">
                                            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-slate-100 border-2 border-teal-500 z-10"></div>
                                            <div className="pb-1">
                                                <p className="text-sm font-medium text-slate-800">{step.text}</p>
                                                <p className="text-xs text-slate-500 mt-0.5">{formatDistance(step.distance)}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex items-center gap-3 px-6 pt-2 pb-6 border-t border-slate-50 bg-white">
                            <button 
                                onClick={handleStartNavigation}
                                className="flex-grow bg-teal-700 hover:bg-teal-800 text-white font-bold h-12 rounded-full shadow-lg shadow-teal-700/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-lg"
                            >
                                <NavigationArrowIcon className="w-5 h-5 fill-current" />
                                Start Navigation
                            </button>
                            <button 
                                onClick={handleShare}
                                className="flex-none w-12 h-12 rounded-full border border-slate-200 bg-slate-50 flex items-center justify-center text-teal-700 hover:bg-slate-100 active:bg-slate-200 transition-colors"
                            >
                                <ShareIcon className="w-5 h-5" />
                            </button>
                             <button 
                                onClick={handleSave}
                                className={`flex-none w-12 h-12 rounded-full border flex items-center justify-center transition-colors ${isSaved ? 'bg-teal-50 border-teal-200 text-teal-700' : 'border-slate-200 bg-slate-50 text-slate-400 hover:text-teal-700'}`}
                            >
                                <BookmarkIcon className={`w-5 h-5 ${isSaved ? 'fill-current' : ''}`} />
                            </button>
                        </div>
                    </div>
                )}
            </div>
            
            <style>{`
                .driver-location-marker {
                    filter: drop-shadow(0 0 4px rgba(0,0,0,0.3));
                    z-index: 1000 !important;
                }
                .hidden-routing-container {
                    display: none;
                }
                .leaflet-control-attribution {
                    display: none;
                }
                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background-color: #cbd5e1;
                    border-radius: 4px;
                }
            `}</style>
        </div>
    );
};

export default MapPage;