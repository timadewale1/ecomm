// components/GooglePlacesAutocomplete.jsx
import React from 'react';
import { LoadScript, Autocomplete } from '@react-google-maps/api';

const libraries = ["places"];

const GooglePlacesAutocomplete = ({ onPlaceSelected }) => {
  const handlePlaceChanged = (autocomplete) => {
    const place = autocomplete.getPlace();
    if (place && place.formatted_address) {
      onPlaceSelected(place.formatted_address);
    }
  };

  return (
    <LoadScript googleMapsApiKey="YOUR_GOOGLE_MAPS_API_KEY" libraries={libraries}>
      <Autocomplete
        onLoad={(autocomplete) => {
          autocomplete.addListener("place_changed", () => handlePlaceChanged(autocomplete));
        }}
      >
        <input
          type="text"
          className="w-full p-2 border border-gray-300 rounded-md"
          placeholder="Add your address"
        />
      </Autocomplete>
    </LoadScript>
  );
};

export default GooglePlacesAutocomplete;
