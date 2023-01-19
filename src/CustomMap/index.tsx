import { GoogleMap, Marker, useJsApiLoader } from "@react-google-maps/api";
import { useCallback, useState } from "react";
import { Location } from "../firebase";

interface MapProps {
    location: Location,
    sx?: object
}

function CustomMap({location, sx}: MapProps) {

    const {isLoaded} = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: "AIzaSyAhhe0Rx3j6_YN5wHJsJ84LZ_TPc59wuq0"
    })

    const [map, setMap] = useState<google.maps.Map | null>(null);

    const onLoad = useCallback((m: google.maps.Map) => {
        setMap(map);
    }, []);

    const onUnmount = useCallback((m: google.maps.Map) => {
        setMap(null);
    }, []);

    return isLoaded ? (
        <GoogleMap
            mapContainerStyle={sx}
            zoom={17}
            center={location}
            onLoad={onLoad}
            onUnmount={onUnmount}>
            <Marker position={location}/>
        </GoogleMap>
    ) : <></>
}

export default CustomMap;