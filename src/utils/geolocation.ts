
export interface Location {
  latitude: number;
  longitude: number;
}

export const getCurrentLocation = (): Promise<Location> => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by this browser.'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      (error) => {
        reject(error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000, // 5 minutes
      }
    );
  });
};

// Haversine formula to calculate distance between two points
export const calculateDistance = (loc1: Location, loc2: Location): number => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (loc2.latitude - loc1.latitude) * (Math.PI / 180);
  const dLon = (loc2.longitude - loc1.longitude) * (Math.PI / 180);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(loc1.latitude * (Math.PI / 180)) *
    Math.cos(loc2.latitude * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return distance;
};

export const isWithinRange = (loc1: Location, loc2: Location, maxDistance: number = 50): boolean => {
  return calculateDistance(loc1, loc2) <= maxDistance;
};

// Sort helpers by distance (nearby first)
export const sortHelpersByDistance = (helpers: any[], userLocation: Location | null): any[] => {
  if (!userLocation) return helpers;
  
  return helpers
    .map(helper => {
      if (typeof helper.location === 'object' && helper.location.latitude) {
        const distance = calculateDistance(userLocation, helper.location as Location);
        return { ...helper, distance: Math.round(distance * 10) / 10 };
      }
      return { ...helper, distance: null };
    })
    .sort((a, b) => {
      // Prioritize helpers with location data
      if (a.distance === null && b.distance !== null) return 1;
      if (a.distance !== null && b.distance === null) return -1;
      if (a.distance === null && b.distance === null) return 0;
      return (a.distance || 0) - (b.distance || 0);
    });
};
