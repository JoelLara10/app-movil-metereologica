import { Platform } from 'react-native';
import * as Location from 'expo-location';
function withTimeout(promise, ms, message) {
  let timer;
  return Promise.race([promise, new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error(message)),ms);})]).finally(()=>clearTimeout(timer));
}
export async function currentCity() {
  let coordinates;
  if(Platform.OS === 'web') {
    if(!globalThis.navigator?.geolocation) throw new Error('Este navegador no permite obtener la ubicación. Busca una ciudad.');
    coordinates = await new Promise((resolve,reject)=>navigator.geolocation.getCurrentPosition(p=>resolve(p.coords),error=>reject(new Error(error.code===1?'No se autorizó la ubicación. Puedes buscar una ciudad o permitirla en tu navegador.':'No pudimos obtener tu ubicación. Activa la ubicación o busca una ciudad.')),{enableHighAccuracy:false,timeout:15000,maximumAge:60000}));
  } else {
    const permission=await Location.requestForegroundPermissionsAsync();
    if(permission.status!=='granted') throw new Error('No se autorizó la ubicación. Puedes buscar una ciudad o permitirla en los ajustes del teléfono.');
    if(!await Location.hasServicesEnabledAsync()) throw new Error('La ubicación del teléfono está desactivada. Actívala o busca una ciudad.');
    const point=await withTimeout(Location.getCurrentPositionAsync({accuracy:Location.Accuracy.Balanced}),18000,'La ubicación está tardando demasiado. Intenta de nuevo o busca una ciudad.');
    coordinates=point.coords;
  }
  const city={name:'Ubicación actual',latitude:coordinates.latitude,longitude:coordinates.longitude,admin1:`${coordinates.latitude.toFixed(2)}°, ${coordinates.longitude.toFixed(2)}°`,country:''};
  if(Platform.OS!=='web') {
    try {
      const [place]=await withTimeout(Location.reverseGeocodeAsync(coordinates),5000,'');
      if(place) {city.name=place.city||place.subregion||place.region||'Ubicación actual';city.admin1=place.region||'';city.country=place.country||'';}
    } catch { /* Coordinates remain usable if the device cannot resolve a city name. */ }
  }
  return city;
}
