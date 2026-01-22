
import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet-routing-machine';
import { 
    BackIcon, 
    LocationMarkerIcon, 
    CarIcon, 
    XCircleIcon, 
    MoreVerticalIcon, 
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

// Base64 encoded SVGs for markers to ensure consistency across environments
const DRIVER_ICON_B64 = 'PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iIzQyODVGNCIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSIyIj48Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSIxMCIvPjxjaXJjbGUgY3g9IjEyIiBjeT0iMTIiIHI9IjQiIGZpbGw9IndoaXRlIi8+PC9zdmc+';
const DEST_ICON_B64 = 'PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iI0VBNDMzNSI+PHBhdGggZD0iTTEyIDJDOC4xMyAyIDUgNS4xMyA1IDljMCA1LjI1IDcgMTMgNyAxM3M3LTcuNzUgNy0xM2MwLTMuODctMy4xMy03LTctN3ptMCA5LjVjLTEuMzggMC0yLjUtMS4xMi0yLjUtMi41czEuMTItMi41IDIuNS0yLjUgMi41IDEuMTIgMi41IDIuNS0xLjEyIDIuNS0yLjUgMi41eiIvPjwvc3ZnPg==';

const driverIcon = new L.Icon({
    iconUrl: `data:image/svg+xml;base64,${DRIVER_ICON_B64}`,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20],
    className: 'driver-location-marker'
});

const destinationIcon = new L.Icon({
    iconUrl: `data:image/svg+xml;base64,${DEST_ICON_B64}`,
    iconSize: [38, 38],
    iconAnchor: [19, 38],
    popupAnchor: [0, -38],
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

interface RouteInfo {
    distance: number;
    time: number;
    destination: string;
    coordinates: { lat: number; lng: number };
}

const MapPage: React.FC<MapPageProps> = ({ onBack }) => {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<L.Map | null>(null);
    const markerRef = useRef<L.Marker | null>(null);
    const routingControlRef = useRef<any>(null); // Use any for L.Routing.Control to avoid strict TS issues
    const positionRef = useRef<L.LatLng | null>(null);

    const [searching, setSearching] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [routeSummary, setRouteSummary] = useState<RouteInfo | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [notification, setNotification] = useState<string | null>(null);
    const [transportMode, setTransportMode] = useState<'car' | 'bike' | 'transit' | 'walk'>('car');
    const [isSaved, setIsSaved] = useState(false);

    const showNotification = (msg: string) => {
        setNotification(msg);
        setTimeout(() => setNotification(null), 3000);
    };

    const handleRecenter = () => {
        if (mapRef.current && positionRef.current) {
            mapRef.current.flyTo(positionRef.current, 16, { duration: 1.5 });
        }
    };

    const handleStartNavigation = () => {
        if (!routeSummary) return;
        const { lat, lng } = routeSummary.coordinates;
        // Opens native map app (Google Maps, Apple Maps, etc.)
        window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
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
            try {
                await navigator.share(shareData);
            } catch (err) {
                // Share cancelled
            }
        } else {
            navigator.clipboard.writeText(shareData.url);
            showNotification("Link copied to clipboard");
        }
    };

    const handleSave = () => {
        const newState = !isSaved;
        setIsSaved(newState);
        if (newState) {
            showNotification("Location saved to favorites");
        } else {
            showNotification("Location removed from favorites");
        }
    };

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchQuery.trim()) return;

        setSearching(true);
        setError(null);
        setIsSaved(false); // Reset save state for new search

        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`);
            
            if (!response.ok) throw new Error("Network response was not ok");
            const results = await response.json();

            if (results && results.length > 0) {
                const result = results[0];
                const destination = L.latLng(parseFloat(result.lat), parseFloat(result.lon));
                const destName = result.display_name.split(',')[0]; 
                
                // Clear existing routing
                if (routingControlRef.current && mapRef.current) {
                    try {
                        mapRef.current.removeControl(routingControlRef.current);
                    } catch (e) { console.warn("Error removing control", e); }
                    routingControlRef.current = null;
                }
                setRouteSummary(null);

                const currentPos = positionRef.current;
                
                if (currentPos && mapRef.current) {
                    // Create routing control
                    const Routing = (L as any).Routing;
                    if (Routing) {
                        const control = Routing.control({
                            waypoints: [
                                L.latLng(currentPos),
                                destination
                            ],
                            routeWhileDragging: false,
                            addWaypoints: false,
                            fitSelectedRoutes: true,
                            showAlternatives: false,
                            containerClassName: 'hidden-routing-container', // Custom class to hide
                            lineOptions: {
                                styles: [{ color: '#1A73E8', opacity: 0.8, weight: 6 }], // Google Blue
                                extendToWaypoints: true,
                                missingRouteTolerance: 0
                            },
                            createMarker: (i: number, wp: any, n: number) => {
                                if (i === n - 1) {
                                    return L.marker(wp.latLng, { icon: destinationIcon });
                                }
                                return null; // Don't show start marker (we have custom driver icon)
                            },
                        });

                        control.on('routesfound', (evt: any) => {
                            const routes = evt.routes;
                            if (routes.length > 0) {
                                const summary = routes[0].summary;
                                setRouteSummary({ 
                                    distance: summary.totalDistance, 
                                    time: summary.totalTime, 
                                    destination: destName,
                                    coordinates: { lat: destination.lat, lng: destination.lng }
                                });
                            }
                        });
                        
                        control.on('routingerror', (err: any) => {
                             console.error("Routing Error", err);
                             setError("Could not calculate route. Try a different location.");
                        });

                        control.addTo(mapRef.current);
                        routingControlRef.current = control;
                    } else {
                        setError("Routing library not loaded.");
                    }
                } else {
                    setError("Waiting for GPS signal...");
                }
            } else {
                setError(`No results for "${searchQuery}"`);
            }
        } catch (err) {
            console.error(err);
            setError("Connection failed.");
        } finally {
            setSearching(false);
        }
    };

    useEffect(() => {
        if (!mapContainerRef.current || mapRef.current) return;

        const map = L.map(mapContainerRef.current, { 
            zoomControl: false,
            attributionControl: false 
        }).setView([31.5204, 74.3587], 13);
        
        mapRef.current = map;
        
        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
            attribution: 'OpenStreetMap',
            maxZoom: 20
        }).addTo(map);

        const onLocationFound = (e: L.LocationEvent) => {
            positionRef.current = e.latlng;

            if (!markerRef.current) {
                // Pulse circle
                L.circle(e.latlng, { radius: e.accuracy, color: '#4285F4', fillColor: '#4285F4', fillOpacity: 0.15, weight: 1 }).addTo(map);
                markerRef.current = L.marker(e.latlng, { icon: driverIcon }).addTo(map);
                map.setView(e.latlng, 16);
            } else {
                markerRef.current.setLatLng(e.latlng);
            }
        };

        map.on('locationfound', onLocationFound);
        map.locate({ watch: true, setView: true, maxZoom: 16, enableHighAccuracy: true });

        return () => {
            if (mapRef.current) {
                mapRef.current.stopLocate();
                mapRef.current.remove();
                mapRef.current = null;
            }
        };
    }, []);

    const getModeTime = (seconds: number, mode: string) => {
        let multiplier = 1;
        switch(mode) {
            case 'bike': multiplier = 3; break;
            case 'transit': multiplier = 1.4; break;
            case 'walk': multiplier = 10; break;
            default: multiplier = 1;
        }
        return formatTime(seconds * multiplier);
    };

    const clearSearch = () => {
        setSearchQuery('');
        setRouteSummary(null);
        if (routingControlRef.current && mapRef.current) {
            mapRef.current.removeControl(routingControlRef.current);
            routingControlRef.current = null;
        }
        handleRecenter();
    };

    return (
        <div className="h-full w-full flex flex-col relative bg-white text-slate-800 font-sans overflow-hidden">
            
            {/* --- Google Maps Style Top Input Card --- */}
            <div className="absolute top-2 left-2 right-2 z-[1000]">
                <div className="bg-white rounded-xl shadow-md border border-slate-100 p-3">
                    <div className="flex items-start gap-3 relative">
                        {/* Back Button */}
                        <button onClick={onBack} className="absolute -left-1 -top-1 p-2 text-slate-400 hover:text-slate-600 z-10">
                             <BackIcon className="w-6 h-6" />
                        </button>
                        
                        {/* Timeline Visual (Dots) */}
                        <div className="flex flex-col items-center pt-3 pl-8 gap-1">
                             <div className="w-3 h-3 rounded-full border-[3px] border-blue-600 bg-white"></div>
                             <div className="flex flex-col gap-1 py-1">
                                <div className="w-1 h-1 rounded-full bg-slate-300"></div>
                                <div className="w-1 h-1 rounded-full bg-slate-300"></div>
                                <div className="w-1 h-1 rounded-full bg-slate-300"></div>
                             </div>
                             <div className="w-4 h-4 text-red-500">
                                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
                             </div>
                        </div>
                        
                        {/* Inputs */}
                        <div className="flex-grow flex flex-col gap-3 pt-1">
                             <div className="relative">
                                 <input 
                                     type="text" 
                                     value="Your location"
                                     readOnly
                                     className="w-full bg-slate-100 text-slate-700 font-medium text-sm rounded-lg px-3 py-2 border-none focus:ring-0 cursor-default"
                                 />
                             </div>
                             <form onSubmit={handleSearch} className="relative">
                                 <input 
                                     type="text" 
                                     value={searchQuery}
                                     onChange={(e) => setSearchQuery(e.target.value)}
                                     placeholder="Choose destination"
                                     className="w-full bg-slate-100 text-slate-900 font-medium text-sm rounded-lg px-3 py-2 border-none focus:ring-2 focus:ring-blue-500 placeholder-slate-400 transition-shadow"
                                 />
                                 {searchQuery && (
                                     <button type="button" onClick={clearSearch} className="absolute right-2 top-2 text-slate-400">
                                         <XCircleIcon className="w-5 h-5" />
                                     </button>
                                 )}
                                 {searching && <div className="absolute right-2 top-2"><Spinner size="sm"/></div>}
                             </form>
                        </div>

                        {/* Right Actions */}
                        <div className="flex flex-col items-center justify-between h-[88px] pt-1">
                             <button className="p-2 text-slate-700 hover:bg-slate-100 rounded-full"><MoreVerticalIcon className="w-5 h-5"/></button>
                             <button className="p-2 text-slate-700 hover:bg-slate-100 rounded-full"><SwapIcon className="w-5 h-5"/></button>
                        </div>
                    </div>
                </div>
            </div>
            
            {/* --- Notifications / Errors --- */}
            {error && (
                <div className="absolute top-44 left-4 right-4 z-[900] bg-red-500 text-white p-3 rounded-lg shadow-lg text-sm flex items-center justify-between animate-fade-in-up">
                    <span>{error}</span>
                    <button onClick={() => setError(null)}><XCircleIcon className="w-5 h-5 opacity-80"/></button>
                </div>
            )}
            
            {notification && (
                <div className="absolute top-44 left-4 right-4 z-[900] bg-slate-800 text-white p-3 rounded-lg shadow-lg text-sm flex items-center justify-center animate-fade-in-up">
                    <CheckCircleIcon className="w-5 h-5 text-green-400 mr-2"/>
                    <span>{notification}</span>
                </div>
            )}

            {/* --- Map --- */}
            <div ref={mapContainerRef} className="flex-grow w-full h-full z-0 bg-slate-100" id="map"></div>
            
            {/* --- Recenter Button --- */}
            <button 
                onClick={handleRecenter} 
                className={`absolute right-4 z-[900] bg-white p-3 rounded-full shadow-lg border border-slate-100 text-blue-600 transition active:scale-95 ${routeSummary ? 'bottom-56' : 'bottom-8'}`}
            >
                <LocationMarkerIcon className="w-6 h-6" />
            </button>

            {/* --- Bottom Sheet --- */}
            <div className={`absolute bottom-0 left-0 right-0 z-[1000] bg-white rounded-t-3xl shadow-[0_-5px_30px_rgba(0,0,0,0.15)] transition-transform duration-300 ease-in-out ${routeSummary ? 'translate-y-0' : 'translate-y-full'}`}>
                {routeSummary && (
                    <div className="pb-6">
                        {/* Drag Handle */}
                        <div className="flex justify-center pt-3 pb-1">
                            <div className="w-10 h-1 bg-slate-300 rounded-full"></div>
                        </div>

                        {/* Transport Modes */}
                        <div className="flex justify-between px-2 pb-2 border-b border-slate-100">
                            {[
                                { id: 'car', icon: <CarIcon className="w-5 h-5"/>, time: formatTime(routeSummary.time) },
                                { id: 'bike', icon: <BikeIcon className="w-5 h-5"/>, time: getModeTime(routeSummary.time, 'bike') },
                                { id: 'transit', icon: <BusIcon className="w-5 h-5"/>, time: getModeTime(routeSummary.time, 'transit') },
                                { id: 'walk', icon: <WalkIcon className="w-5 h-5"/>, time: getModeTime(routeSummary.time, 'walk') }
                            ].map((mode) => (
                                <button 
                                    key={mode.id}
                                    onClick={() => setTransportMode(mode.id as any)}
                                    className={`flex-1 flex flex-col items-center py-2 rounded-lg transition-colors ${transportMode === mode.id ? 'text-blue-600' : 'text-slate-400'}`}
                                >
                                    <div className={`p-1.5 rounded-full mb-1 ${transportMode === mode.id ? 'bg-blue-600 text-white shadow-md' : 'bg-transparent text-slate-500'}`}>
                                        {mode.icon}
                                    </div>
                                    <span className="text-xs font-bold">{mode.time.split(' ')[0] + (mode.time.includes('hr') ? ' hr' : ' min')}</span>
                                </button>
                            ))}
                        </div>

                        {/* Trip Info */}
                        <div className="px-5 pt-4 pb-2">
                             <div className="flex items-end gap-2 mb-1">
                                <h1 className="text-3xl font-bold text-green-600">
                                    {getModeTime(routeSummary.time, transportMode)}
                                </h1>
                                <span className="text-lg text-slate-500 font-medium mb-1">
                                    ({formatDistance(routeSummary.distance)})
                                </span>
                             </div>
                             <p className="text-slate-500 text-sm">Fastest route now due to traffic conditions</p>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-3 px-5 pt-4">
                            <button 
                                onClick={handleStartNavigation}
                                className="flex-grow bg-[#1A73E8] hover:bg-blue-700 text-white font-bold h-12 rounded-full shadow-lg shadow-blue-200 active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-lg"
                            >
                                <NavigationArrowIcon className="w-5 h-5" />
                                Start
                            </button>
                            <button 
                                onClick={handleShare}
                                className="flex-none w-12 h-12 rounded-full border border-slate-200 flex items-center justify-center text-blue-600 hover:bg-slate-50 active:bg-slate-100"
                            >
                                <ShareIcon className="w-5 h-5" />
                            </button>
                            <button 
                                onClick={handleSave}
                                className={`flex-none w-12 h-12 rounded-full border flex items-center justify-center transition active:scale-95 ${isSaved ? 'bg-blue-50 border-blue-200 text-blue-600' : 'border-slate-200 text-slate-400 hover:text-blue-600 hover:bg-slate-50'}`}
                            >
                                <BookmarkIcon className={`w-5 h-5 ${isSaved ? 'fill-current' : ''}`} />
                            </button>
                        </div>
                    </div>
                )}
            </div>
            
            <style>{`
                .driver-location-marker {
                    filter: drop-shadow(0 0 6px rgba(66, 133, 244, 0.5));
                    animation: pulse-marker 2s infinite;
                    z-index: 1000 !important;
                }
                @keyframes pulse-marker {
                    0% { transform: scale(1); opacity: 1; }
                    50% { transform: scale(1.1); opacity: 0.8; }
                    100% { transform: scale(1); opacity: 1; }
                }
                .leaflet-routing-container {
                    display: none !important;
                }
                .leaflet-control-attribution {
                    display: none;
                }
                .leaflet-bottom.leaflet-right {
                    margin-bottom: 200px;
                }
            `}</style>
        </div>
    );
};

export default MapPage;
