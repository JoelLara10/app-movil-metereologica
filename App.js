import React,{useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {ActivityIndicator,FlatList,Linking,Modal,Platform,Pressable,ScrollView,StatusBar,StyleSheet,Text,View} from 'react-native';
import {SafeAreaProvider,SafeAreaView} from 'react-native-safe-area-context';

import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {getWeather} from './src/api.js';
import {currentCity} from './src/location.js';
import {cityKey,MAX_PLACES,readPreferences,region,savePreferences,STORAGE_KEY,uniqueCities} from './src/model.js';
import SearchSheet from './src/SearchSheet.js';
import WeatherPage from './src/WeatherPage.js';
import {palette as p} from './src/theme.js';
function IconButton({label,icon,onPress,selected=false}) {return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({pressed})=>[s.iconButton,selected&&s.iconSelected,pressed&&{opacity:.5}]}><Ionicons name={icon} size={21} color={p.green}/></Pressable>;}
export default function App(){return <SafeAreaProvider><Brisa/></SafeAreaProvider>;}
function Brisa(){
 const [favorites,setFavorites]=useState([]),[recent,setRecent]=useState([]),[unit,setUnit]=useState('C');
 const [ready,setReady]=useState(false),[location,setLocation]=useState(null),[locationBusy,setLocationBusy]=useState(true),[locationError,setLocationError]=useState('');
 const [entries,setEntries]=useState({}),[loading,setLoading]=useState({}),[errors,setErrors]=useState({});
 const [preview,setPreview]=useState(null),[activeKey,setActiveKey]=useState('local'),[width,setWidth]=useState(0);
 const [pagerHeight,setPagerHeight]=useState(0);
 const [searchOpen,setSearchOpen]=useState(false),[manageOpen,setManageOpen]=useState(false),[message,setMessage]=useState('');
 const pager=useRef(null),scrollTimer=useRef(null),mounted=useRef(false),entriesRef=useRef({}),pending=useRef(new Map()),lastAttempt=useRef(new Map()),rateLimited=useRef(0),writeQueue=useRef(Promise.resolve()),locating=useRef(false);
 entriesRef.current=entries;
 useEffect(()=>{
  mounted.current=true;
  AsyncStorage.getItem(STORAGE_KEY).then(raw=>{
   if(!mounted.current)return;const preferences=readPreferences(raw);setFavorites(preferences.favorites);setRecent(preferences.recent);setUnit(preferences.unit);entriesRef.current=preferences.cache;setEntries(preferences.cache);
  }).catch(()=>{if(mounted.current)setMessage('No pudimos leer las ubicaciones guardadas. Puedes seguir usando Brisa.');}).finally(()=>{if(mounted.current)setReady(true);});
  return ()=>{mounted.current=false;clearTimeout(scrollTimer.current);for(const controller of pending.current.values())controller.abort();pending.current.clear();};
 },[]);
 useEffect(()=>{
  if(!ready)return;
  const raw=savePreferences(favorites,recent,unit,entries);
  writeQueue.current=writeQueue.current.catch(()=>{}).then(()=>AsyncStorage.setItem(STORAGE_KEY,raw)).catch(()=>{if(mounted.current)setMessage('No se pudieron guardar los cambios en el dispositivo.');});
 },[ready,favorites,recent,unit,entries]);
 useEffect(()=>{if(!message)return;const timer=setTimeout(()=>setMessage(''),5000);return ()=>clearTimeout(timer);},[message]);
 const loadWeather=useCallback(async(city,{force=false}={})=>{
  if(!city)return;const key=cityKey(city);const existing=entriesRef.current[key];
  if(pending.current.has(key))return;
  if(!force&&existing&&!existing.fromCache&&Date.now()-existing.fetchedAt<300000)return;
  if(Date.now()<rateLimited.current){setErrors(old=>({...old,[key]:'Límite de consultas alcanzado. Espera un minuto para actualizar.'}));return;}
  if(Date.now()-(lastAttempt.current.get(key)||0)<1500)return;
  lastAttempt.current.set(key,Date.now());
  const controller=new AbortController();pending.current.set(key,controller);
  setLoading(old=>({...old,[key]:true}));setErrors(old=>({...old,[key]:''}));
  try {
   const weather=await getWeather(city,undefined,{signal:controller.signal});
   if(mounted.current){const entry={weather,fetchedAt:Date.now(),fromCache:false};entriesRef.current={...entriesRef.current,[key]:entry};setEntries(old=>({...old,[key]:entry}));}
  } catch(e){if(mounted.current&&e.name!=='AbortError'){if(e.status===429)rateLimited.current=Date.now()+60000;setErrors(old=>({...old,[key]:e.message}));setEntries(old=>old[key]?{...old,[key]:{...old[key],fromCache:true}}:old);}}
  finally {pending.current.delete(key);if(mounted.current)setLoading(old=>({...old,[key]:false}));}
 },[]);
 const locate=useCallback(async()=>{
  if(locating.current)return;locating.current=true;setLocationBusy(true);setLocationError('');
  try {const city=await currentCity();if(mounted.current){setLocation(city);setActiveKey('local');loadWeather(city,{force:true});}}
  catch(e){if(mounted.current)setLocationError(e.message);}
  finally {locating.current=false;if(mounted.current)setLocationBusy(false);}
 },[loadWeather]);
 useEffect(()=>{if(ready)locate();},[ready,locate]);
 const pages=useMemo(()=>{
  const list=[{key:'local',city:location,isLocal:true},...favorites.map(city=>({key:cityKey(city),city,isLocal:false}))];
  if(preview&&!favorites.some(city=>cityKey(city)===cityKey(preview)))list.push({key:cityKey(preview),city:preview,isLocal:false});
  return list;
 },[location,favorites,preview]);
 const activeIndex=Math.max(0,pages.findIndex(page=>page.key===activeKey)),activePage=pages[activeIndex];
 const activeCityKey=activePage.city?cityKey(activePage.city):'';
 useEffect(()=>{if(ready&&activePage.city)loadWeather(activePage.city);},[ready,activeCityKey,loadWeather]);
 useEffect(()=>{if(!pages.some(page=>page.key===activeKey))setActiveKey('local');},[pages,activeKey]);
 useEffect(()=>{if(width>0)pager.current?.scrollToOffset({offset:activeIndex*width,animated:false});},[activeIndex,width,pages.length]);
 function choose(city){setRecent(old=>uniqueCities([city,...old],4));setPreview(city);setActiveKey(cityKey(city));setSearchOpen(false);}
 function togglePin(city){
  const key=cityKey(city);
  if(favorites.some(c=>cityKey(c)===key)) {setFavorites(old=>old.filter(c=>cityKey(c)!==key));setPreview(city);setMessage(`${city.name} se quitó de tus fijadas.`);return;}
  if(favorites.length>=MAX_PLACES){setMessage(`Puedes fijar hasta ${MAX_PLACES} ciudades. Quita una para agregar otra.`);return;}
  setFavorites(old=>uniqueCities([...old,city]));setMessage(`${city.name} se agregó a tus fijadas.`);
 }
 function remove(city){const key=cityKey(city);setFavorites(old=>old.filter(c=>cityKey(c)!==key));if(preview&&cityKey(preview)===key)setPreview(null);if(activeKey===key)setActiveKey('local');}
 function move(index,direction){setFavorites(old=>{const next=[...old],target=index+direction;if(target<0||target>=next.length)return old;[next[index],next[target]]=[next[target],next[index]];return next;});}
 return <SafeAreaView style={s.screen} edges={['top','left','right','bottom']}><StatusBar barStyle="dark-content" backgroundColor={p.bg}/>
  <View style={s.app} onLayout={e=>setWidth(e.nativeEvent.layout.width)}>
   <View style={s.header}><View style={s.brandRow}><Text style={s.brand}>brisa</Text><View style={s.brandDot}/></View><View style={s.headerActions}><Pressable accessibilityRole="button" accessibilityLabel={`Cambiar a grados ${unit==='C'?'Fahrenheit':'Celsius'}`} onPress={()=>setUnit(old=>old==='C'?'F':'C')} style={s.unit}><Text style={s.unitText}>°{unit}</Text></Pressable><IconButton label="Administrar ubicaciones fijadas" icon="grid-outline" onPress={()=>setManageOpen(true)}/></View></View>
   <Pressable accessibilityRole="button" accessibilityLabel="Abrir buscador de ciudades" onPress={()=>setSearchOpen(true)} style={({pressed})=>[s.searchBar,pressed&&{opacity:.6}]}><Ionicons name="search-outline" size={19} color={p.green}/><Text style={s.searchPlaceholder}>Descubre el clima de otra ciudad</Text><View style={s.searchPlus}><Ionicons name="add" size={18} color={p.green}/></View></Pressable>
   <View style={s.tabsWrapper} accessibilityRole="tablist"><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tabs}>{pages.map(page=><Pressable accessibilityRole="tab" accessibilityLabel={page.isLocal?'Ver mi ubicación':`Ver ${page.city.name}`} accessibilityState={{selected:activePage.key===page.key}} {...(Platform.OS==='web'?{'aria-selected':activePage.key===page.key}:{})} key={page.key} onPress={()=>setActiveKey(page.key)} style={[s.tab,activePage.key===page.key&&s.tabActive]}><Ionicons name={page.isLocal?'navigate':favorites.some(c=>cityKey(c)===page.key)?'bookmark':'location-outline'} size={12} color={activePage.key===page.key?'#fff':p.muted}/><Text numberOfLines={1} style={[s.tabText,activePage.key===page.key&&s.tabTextActive]}>{page.isLocal?'Mi ubicación':page.city.name}</Text></Pressable>)}<Pressable accessibilityRole="button" accessibilityLabel="Agregar ubicación" onPress={()=>setSearchOpen(true)} style={s.addTab}><Ionicons name="add" size={19} color={p.green}/></Pressable></ScrollView></View>
   {!ready||width===0?<View style={s.starting}><ActivityIndicator color={p.green}/><Text style={s.startingText}>Abriendo tu cielo…</Text></View>:<FlatList style={{flex:1,minHeight:0}} onLayout={e=>setPagerHeight(e.nativeEvent.layout.height)} ref={pager} data={pages} extraData={{entries,loading,errors,unit,favorites,locationBusy,locationError,width,pagerHeight}} horizontal pagingEnabled directionalLockEnabled scrollEventThrottle={16} onScroll={Platform.OS==='web'?e=>{const offset=e.nativeEvent.contentOffset.x;clearTimeout(scrollTimer.current);scrollTimer.current=setTimeout(()=>{const index=Math.round(offset/width);if(pages[index])setActiveKey(pages[index].key);},150);}:undefined} showsHorizontalScrollIndicator={false} keyExtractor={item=>item.key} getItemLayout={(_,index)=>({length:width,offset:width*index,index})} initialNumToRender={2} windowSize={3} onMomentumScrollEnd={e=>{const index=Math.round(e.nativeEvent.contentOffset.x/width);if(pages[index])setActiveKey(pages[index].key);}} renderItem={({item,index})=>{
     const key=item.city?cityKey(item.city):'';
     return <WeatherPage page={item} width={width} height={pagerHeight} entry={entries[key]} busy={loading[key]} error={errors[key]||(item.isLocal?locationError:'')} unit={unit} pinned={favorites.some(city=>cityKey(city)===item.key)} onTogglePin={togglePin} onRefresh={city=>loadWeather(city,{force:true})} onLocate={locate} locationBusy={locationBusy} locationError={locationError} onSearch={()=>setSearchOpen(true)} position={index} total={pages.length}/>;
    }}/>} 
   {!!message&&<View accessibilityRole="alert" style={s.toast}><Ionicons name="information-circle-outline" size={19} color="#fff"/><Text style={s.toastText}>{message}</Text><Pressable accessibilityRole="button" accessibilityLabel="Cerrar mensaje" onPress={()=>setMessage('')} hitSlop={10}><Ionicons name="close" color="#fff" size={17}/></Pressable></View>}
  </View>
  <SearchSheet visible={searchOpen} onClose={()=>setSearchOpen(false)} onSelect={choose} recent={recent}/>
  <Modal visible={manageOpen} animationType="slide" onRequestClose={()=>setManageOpen(false)}><SafeAreaView style={s.screen}><View style={s.manage}>
   <View style={s.manageHeader}><View><Text style={s.eyebrow}>TU PEQUEÑO MUNDO</Text><Text style={s.manageTitle}>Tus ubicaciones</Text></View><IconButton label="Cerrar ubicaciones" icon="close" onPress={()=>setManageOpen(false)}/></View>
   <Text style={s.manageCopy}>Fija hasta {MAX_PLACES} ciudades. Ordénalas aquí y desliza entre ellas desde el inicio.</Text>
   <ScrollView contentContainerStyle={s.manageList}>
    <Pressable accessibilityRole="button" onPress={()=>{setActiveKey('local');setManageOpen(false);locate();}} style={s.localRow}><View style={s.localIcon}><Ionicons name="navigate" size={22} color={p.green}/></View><View style={{flex:1}}><Text style={s.savedName}>Mi ubicación</Text><Text style={s.savedRegion}>Se obtiene al abrir la app</Text></View><Ionicons name="chevron-forward" color={p.muted} size={20}/></Pressable>
    <Text style={s.savedLabel}>FIJADAS · {favorites.length} / {MAX_PLACES}</Text>
    {favorites.length===0&&<View style={s.noSaved}><Ionicons name="bookmarks-outline" color={p.muted} size={40}/><Text style={s.savedName}>Guarda tus lugares favoritos</Text><Text style={s.manageCopy}>Busca una ciudad y toca el marcador junto a su nombre para fijarla.</Text></View>}
    {favorites.map((city,index)=><View key={cityKey(city)} style={s.savedRow}><Pressable accessibilityRole="button" accessibilityLabel={`Abrir ${city.name}`} onPress={()=>{setActiveKey(cityKey(city));setManageOpen(false);}} style={s.savedInfo}><Text style={s.savedName}>{city.name}</Text><Text style={s.savedRegion}>{region(city)}</Text></Pressable><View style={s.reorder}><Pressable accessibilityRole="button" accessibilityLabel={`Mover ${city.name} antes`} disabled={index===0} onPress={()=>move(index,-1)} style={[s.smallIcon,index===0&&{opacity:.25}]}><Ionicons name="chevron-up" size={19} color={p.green}/></Pressable><Pressable accessibilityRole="button" accessibilityLabel={`Mover ${city.name} después`} disabled={index===favorites.length-1} onPress={()=>move(index,1)} style={[s.smallIcon,index===favorites.length-1&&{opacity:.25}]}><Ionicons name="chevron-down" size={19} color={p.green}/></Pressable></View><Pressable accessibilityRole="button" accessibilityLabel={`Eliminar ${city.name}`} onPress={()=>remove(city)} style={s.remove}><Ionicons name="trash-outline" size={19} color={p.danger}/></Pressable></View>)}
    <Pressable accessibilityRole="button" onPress={()=>{setManageOpen(false);setTimeout(()=>setSearchOpen(true),350);}} style={s.addLocation}><Ionicons name="add-circle-outline" size={23} color={p.green}/><Text style={s.addLocationText}>Buscar otra ubicación</Text></Pressable>
    <View style={s.about}><Ionicons name="shield-checkmark-outline" color={p.green} size={20}/><Text style={s.aboutText}>Tus ciudades, búsquedas recientes y preferencia de unidades se guardan solo en este dispositivo. El último clima de tus fijadas se conserva para consultarlo sin conexión. Tu posición actual no se guarda.</Text></View>
    <Text style={s.aboutText}>Solo se pide ubicación mientras usas la app. Puedes cambiar el permiso en los ajustes del dispositivo.</Text>
    {Platform.OS!=='web'&&<Pressable accessibilityRole="button" onPress={()=>Linking.openSettings()} style={{paddingVertical:18}}><Text style={s.settingsLink}>Abrir ajustes de ubicación</Text></Pressable>}
    <Text style={s.version}>BRISA 2.0 · EXPO SDK 58</Text>
   </ScrollView>
  </View></SafeAreaView></Modal>
 </SafeAreaView>;
}
const s=StyleSheet.create({screen:{flex:1,backgroundColor:p.bg},app:{flex:1,width:'100%',maxWidth:600,alignSelf:'center'},header:{paddingHorizontal:24,paddingTop:15,paddingBottom:20,flexDirection:'row',justifyContent:'space-between',alignItems:'center'},brandRow:{flexDirection:'row',alignItems:'baseline',gap:3},brand:{fontSize:36,fontWeight:'800',letterSpacing:-2,color:p.ink},brandDot:{width:7,height:7,borderRadius:4,backgroundColor:p.gold},headerActions:{flexDirection:'row',alignItems:'center',gap:9},iconButton:{height:42,width:42,borderRadius:15,borderWidth:1,borderColor:p.line,alignItems:'center',justifyContent:'center',backgroundColor:'#F1F3EB'},iconSelected:{backgroundColor:p.pale},unit:{height:42,minWidth:45,alignItems:'center',justifyContent:'center'},unitText:{fontSize:14,fontWeight:'600',color:p.green},searchBar:{marginHorizontal:22,paddingLeft:16,paddingRight:10,minHeight:54,borderWidth:1,borderColor:p.line,backgroundColor:p.paper,borderRadius:18,flexDirection:'row',gap:10,alignItems:'center'},searchPlaceholder:{flex:1,fontSize:12,color:p.muted},searchPlus:{width:32,height:32,borderRadius:11,backgroundColor:p.pale,alignItems:'center',justifyContent:'center'},tabsWrapper:{marginTop:18,marginBottom:7},tabs:{gap:8,paddingHorizontal:22,paddingBottom:7},tab:{maxWidth:175,minHeight:36,paddingVertical:9,paddingHorizontal:13,flexDirection:'row',alignItems:'center',gap:6,borderRadius:20,backgroundColor:'#EBEFE6'},tabActive:{backgroundColor:p.green},tabText:{fontSize:11,color:p.muted,fontWeight:'600',flexShrink:1},tabTextActive:{color:'#fff'},addTab:{width:36,height:36,borderRadius:18,borderWidth:1,borderColor:'#D3DDCE',borderStyle:'dashed',alignItems:'center',justifyContent:'center'},starting:{flex:1,alignItems:'center',justifyContent:'center',gap:12},startingText:{fontSize:13,color:p.muted},toast:{position:'absolute',left:20,right:20,bottom:16,padding:16,borderRadius:18,backgroundColor:'#234F43',flexDirection:'row',gap:10,alignItems:'center',elevation:10,shadowColor:'#000',shadowOpacity:.15,shadowRadius:12,shadowOffset:{width:0,height:5}},toastText:{flex:1,fontSize:12,lineHeight:18,color:'#fff'},manage:{width:'100%',maxWidth:600,alignSelf:'center',flex:1,padding:24},manageHeader:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',paddingTop:18,marginBottom:14},eyebrow:{fontSize:9,letterSpacing:1.5,color:p.muted,fontWeight:'700',marginBottom:8},manageTitle:{fontSize:29,fontWeight:'700',letterSpacing:-1,color:p.ink},manageCopy:{fontSize:13,lineHeight:22,color:p.muted},manageList:{paddingBottom:30},localRow:{marginVertical:24,padding:16,borderRadius:20,borderWidth:1,borderColor:p.line,backgroundColor:p.paper,flexDirection:'row',alignItems:'center',gap:12},localIcon:{height:42,width:42,borderRadius:14,backgroundColor:p.pale,alignItems:'center',justifyContent:'center'},savedLabel:{fontSize:9,fontWeight:'700',letterSpacing:1.5,color:p.muted,marginBottom:8},savedRow:{flexDirection:'row',alignItems:'center',borderBottomWidth:1,borderColor:p.line,paddingVertical:12,gap:8},savedInfo:{flex:1,paddingVertical:12},savedName:{fontSize:16,fontWeight:'600',color:p.ink},savedRegion:{fontSize:11,lineHeight:18,color:p.muted,marginTop:4},reorder:{flexDirection:'column'},smallIcon:{width:38,height:30,alignItems:'center',justifyContent:'center'},remove:{height:44,width:38,alignItems:'center',justifyContent:'center'},addLocation:{marginVertical:22,padding:18,borderWidth:1,borderColor:'#CAD8C7',borderStyle:'dashed',borderRadius:18,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:9},addLocationText:{fontSize:13,fontWeight:'600',color:p.green},noSaved:{paddingVertical:25,alignItems:'center',gap:14},about:{flexDirection:'row',gap:10,paddingVertical:14,borderTopWidth:1,borderColor:p.line,marginTop:10},aboutText:{fontSize:11,lineHeight:19,color:p.muted,flex:1},settingsLink:{fontSize:12,color:p.green,textDecorationLine:'underline'},version:{fontSize:9,letterSpacing:1.5,color:'#A1AD9B',marginTop:30,textAlign:'center'}});





