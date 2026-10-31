import React,{useCallback,useEffect,useRef,useState} from 'react';
import {ActivityIndicator,KeyboardAvoidingView,Modal,Platform,Pressable,ScrollView,StyleSheet,Text,TextInput,View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import {searchCities,validateQuery} from './api.js';
import {cityKey,region} from './model.js';
import {palette as p} from './theme.js';
export default function SearchSheet({visible,onClose,onSelect,recent}) {
 const [query,setQuery]=useState(''),[results,setResults]=useState([]),[status,setStatus]=useState('idle'),[error,setError]=useState(''),[focused,setFocused]=useState(false);
 const request=useRef(null),timer=useRef(null),generation=useRef(0),blockedUntil=useRef(0);
 const execute=useCallback(async(value)=>{
  const token=++generation.current;request.current?.abort();setError('');
  try {validateQuery(value);}catch(e){setStatus('error');setResults([]);setError(e.message);return;}
  if(Date.now()<blockedUntil.current){setStatus('error');setError('Límite de consultas. Espera un minuto para seguir buscando.');return;}
  const controller=new AbortController();request.current=controller;setStatus('loading');setResults([]);
  try {const cities=await searchCities(value,undefined,{signal:controller.signal});if(token!==generation.current)return;setResults(cities);setStatus('done');}
  catch(e){if(token!==generation.current||e.name==='AbortError')return;if(e.status===429)blockedUntil.current=Date.now()+60000;setStatus('error');setError(e.message);}
 },[]);
 useEffect(()=>{
  if(!visible)return;
  setQuery('');setResults([]);setError('');setStatus('idle');
  return ()=>{++generation.current;request.current?.abort();clearTimeout(timer.current);};
 },[visible]);
 useEffect(()=>{
  if(!visible)return;
  clearTimeout(timer.current);++generation.current;request.current?.abort();setResults([]);setError('');
  if(query.trim().length<3){setStatus('idle');return;}
  setStatus('waiting');timer.current=setTimeout(()=>execute(query),500);
  return ()=>clearTimeout(timer.current);
 },[query,visible,execute]);
 function submit(){clearTimeout(timer.current);execute(query);}
 const pick=city=>{request.current?.abort();++generation.current;onSelect(city);};
 return <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
  <SafeAreaView style={s.screen}><KeyboardAvoidingView behavior={Platform.OS==='ios'?'padding':undefined} style={s.body}>
   <View style={s.top}><View><Text style={s.eyebrow}>EXPLORA EL MUNDO</Text><Text style={s.title}>¿A dónde vamos?</Text></View><Pressable accessibilityRole="button" accessibilityLabel="Cerrar búsqueda" onPress={onClose} style={s.close}><Ionicons name="close" size={24} color={p.ink}/></Pressable></View>
   <View style={[s.search,focused&&{borderColor:p.green}]}><Ionicons name="search-outline" size={21} color={p.green}/><TextInput onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)} autoFocus={visible} accessibilityLabel="Buscar ciudad" placeholder="Ciudad o código postal" placeholderTextColor={p.muted} value={query} onChangeText={setQuery} maxLength={80} returnKeyType="search" onSubmitEditing={submit} style={[s.input,Platform.OS==='web'&&{outlineStyle:'none'}]}/>{query.length>0&&<Pressable accessibilityRole="button" accessibilityLabel="Limpiar búsqueda" onPress={()=>setQuery('')} hitSlop={10}><Ionicons name="close-circle" size={20} color={p.muted}/></Pressable>}</View>
   <View style={s.hintRow}><Text style={s.hint}>Sugerencias al escribir 3 letras</Text><Pressable accessibilityRole="button" onPress={submit} style={s.submit}><Text style={s.submitText}>Buscar</Text><Ionicons name="arrow-forward" size={15} color={p.green}/></Pressable></View>
   <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.results}>
   {(status==='loading'||status==='waiting')&&<View style={s.state}><ActivityIndicator color={p.green}/><Text style={s.stateText}>Buscando tu próximo destino…</Text></View>}
   {error!==''&&<View accessibilityRole="alert" style={s.notice}><Ionicons name="information-circle-outline" color={p.danger} size={24}/><Text style={s.error}>{error}</Text></View>}
   {status==='done'&&results.length===0&&<View style={s.empty}><Ionicons name="search-outline" size={48} color={p.muted}/><Text style={s.emptyTitle}>No encontramos esa ciudad</Text><Text style={s.emptyText}>Prueba otro nombre o agrega el país, por ejemplo «Madrid, España».</Text></View>}
   {results.length>0&&<Text style={s.section}>COINCIDENCIAS</Text>}
   {results.map(city=><Pressable accessibilityRole="button" accessibilityLabel={`Ver clima de ${city.name}, ${city.country||''}, ${city.admin1||''}`} key={cityKey(city)} onPress={()=>pick(city)} style={({pressed})=>[s.result,pressed&&s.pressed]}><View style={s.pin}><Ionicons name="location-outline" size={22} color={p.green}/></View><View style={s.resultInfo}><Text style={s.cityName}>{city.name}</Text><Text style={s.region}>{region(city)||`${city.latitude.toFixed(2)}°, ${city.longitude.toFixed(2)}°`}</Text></View><Ionicons name="arrow-up-right-box-outline" size={20} color={p.muted}/></Pressable>)}
   {status==='idle'&&query.trim().length<3&&<>
    {recent.length>0&&<><Text style={s.section}>VISTAS RECIENTEMENTE</Text>{recent.map(city=><Pressable key={cityKey(city)} accessibilityRole="button" accessibilityLabel={`Volver a ${city.name}`} onPress={()=>pick(city)} style={s.result}><Ionicons name="time-outline" size={22} color={p.muted}/><View style={s.resultInfo}><Text style={s.cityName}>{city.name}</Text><Text style={s.region}>{region(city)}</Text></View><Ionicons name="chevron-forward" size={18} color={p.muted}/></Pressable>)}</>}
    <Text style={[s.section,{marginTop:30}]}>UN POCO DE INSPIRACIÓN</Text><View style={s.chips}>{['Toluca','Ciudad de México','Monterrey','Madrid','Tokio','París'].map(name=><Pressable key={name} accessibilityRole="button" onPress={()=>setQuery(name)} style={s.chip}><Text style={s.chipText}>{name}</Text></Pressable>)}</View>
    <Text style={s.note}>Elige una coincidencia y fíjala para tener su clima siempre a mano.</Text>
   </>}
   </ScrollView>
  </KeyboardAvoidingView></SafeAreaView>
 </Modal>;
}
const s=StyleSheet.create({screen:{flex:1,backgroundColor:p.bg},body:{flex:1,width:'100%',maxWidth:650,alignSelf:'center'},top:{padding:24,paddingTop:26,flexDirection:'row',justifyContent:'space-between',alignItems:'center'},eyebrow:{fontSize:10,letterSpacing:2,color:p.muted,fontWeight:'700',marginBottom:9},title:{fontSize:29,letterSpacing:-1,fontWeight:'700',color:p.ink},close:{width:44,height:44,borderRadius:22,backgroundColor:p.pale,alignItems:'center',justifyContent:'center'},search:{marginHorizontal:24,paddingHorizontal:16,minHeight:58,backgroundColor:p.paper,borderWidth:1,borderColor:p.line,borderRadius:18,flexDirection:'row',alignItems:'center',gap:10},input:{flex:1,minWidth:0,fontSize:16,paddingVertical:16,color:p.ink},hintRow:{paddingHorizontal:26,marginTop:12,marginBottom:18,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},hint:{fontSize:11,color:p.muted},submit:{minHeight:38,flexDirection:'row',gap:6,alignItems:'center',paddingHorizontal:8},submitText:{color:p.green,fontWeight:'700',fontSize:13},results:{paddingHorizontal:24,paddingBottom:40},section:{fontSize:10,fontWeight:'700',letterSpacing:1.5,color:p.muted,marginBottom:12},result:{flexDirection:'row',alignItems:'center',paddingVertical:18,gap:14,borderBottomWidth:1,borderColor:p.line},pin:{height:44,width:44,backgroundColor:p.pale,borderRadius:15,alignItems:'center',justifyContent:'center'},resultInfo:{flex:1},cityName:{fontSize:17,fontWeight:'600',color:p.ink},region:{fontSize:12,color:p.muted,lineHeight:19,marginTop:4},pressed:{opacity:.55},state:{paddingVertical:36,gap:12,alignItems:'center'},stateText:{fontSize:13,color:p.muted},notice:{flexDirection:'row',gap:10,alignItems:'center',padding:18,backgroundColor:'#F8EAE1',borderRadius:16},error:{flex:1,color:p.danger,lineHeight:21},empty:{paddingVertical:38,alignItems:'center',gap:14},emptyTitle:{fontSize:20,fontWeight:'600',color:p.ink},emptyText:{fontSize:14,lineHeight:22,color:p.muted,textAlign:'center'},chips:{flexDirection:'row',flexWrap:'wrap',gap:10},chip:{paddingVertical:12,paddingHorizontal:16,borderRadius:24,backgroundColor:p.pale},chipText:{color:p.green,fontSize:13,fontWeight:'500'},note:{fontSize:13,lineHeight:22,color:p.muted,marginTop:28}});


