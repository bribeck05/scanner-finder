import React,{useEffect,useRef,useState,useMemo} from 'react';
import {SafeAreaView,View,Text,TextInput,FlatList,TouchableOpacity,StyleSheet,StatusBar} from 'react-native';
import {Audio} from 'expo-av';
import * as Location from 'expo-location';
const API='https://api.openmhz.com';
const isActive=s=>s.active!==false&&(!s.lastActive||Date.now()-new Date(s.lastActive)<6*36e5);
export default function App(){
  const [systems,setSystems]=useState([]);const [q,setQ]=useState('');const [activeOnly,setActiveOnly]=useState(true);
  const [status,setStatus]=useState('Loading systems…');const [cur,setCur]=useState(null);const [now,setNow]=useState('');
  const [log,setLog]=useState([]);const [paused,setPaused]=useState(false);
  const st=useRef({queue:[],last:0,sound:null,playing:false,tgs:{},sys:null,paused:false}).current;
  useEffect(()=>{Audio.setAudioModeAsync({staysActiveInBackground:true,playsInSilentModeIOS:true});
    fetch(API+'/systems').then(r=>r.json()).then(j=>{setSystems(j.systems||[]);setStatus('')}).catch(()=>setStatus('Could not reach OpenMHz.'));},[]);
  useEffect(()=>{if(!cur)return;const t=setInterval(fetchNew,5000);return()=>clearInterval(t)},[cur]);
  const list=useMemo(()=>{const x=q.trim().toLowerCase();return systems.filter(s=>(!activeOnly||isActive(s))&&(!x||[s.name,s.city,s.county,s.state,s.shortName,s.description].join(' ').toLowerCase().includes(x))).sort((a,b)=>(''+a.state).localeCompare(b.state)||(''+a.name).localeCompare(b.name))},[systems,q,activeOnly]);
  const label=c=>{const t=st.tgs[c.talkgroupNum];return (t&&(t.description||t.alpha))||'Talkgroup '+c.talkgroupNum};
  async function playNext(){if(st.paused||st.playing)return;const c=st.queue.shift();if(!c){setNow('Listening… waiting for next transmission');return}
    st.playing=true;const line=`${new Date(c.time).toLocaleTimeString()} · ${label(c)} · ${c.len||'?'}s`;setNow('▶ '+line);setLog(l=>[line,...l].slice(0,50));
    try{if(st.sound)await st.sound.unloadAsync();const {sound}=await Audio.Sound.createAsync({uri:c.url},{shouldPlay:true});st.sound=sound;
      sound.setOnPlaybackStatusUpdate(s=>{if(s.didJustFinish){st.playing=false;playNext()}});}catch(e){st.playing=false;playNext()}}
  async function fetchNew(){if(!st.sys)return;try{const j=await(await fetch(`${API}/${st.sys}/calls/newer?time=${st.last}`)).json();
    (j.calls||[]).sort((a,b)=>new Date(a.time)-new Date(b.time)).forEach(c=>{const t=new Date(c.time).getTime();if(t>st.last){st.last=t;st.queue.push(c)}});playNext()}catch(e){}}
  async function start(s){await stop();setCur(s);st.sys=s.shortName;setLog([]);setNow('Loading recent calls…');
    try{st.tgs=(await(await fetch(`${API}/${s.shortName}/talkgroups`)).json()).talkgroups||{}}catch(e){st.tgs={}}
    try{const c=((await(await fetch(`${API}/${s.shortName}/calls`)).json()).calls||[]).sort((a,b)=>new Date(a.time)-new Date(b.time));
      st.queue=c.slice(-5);st.last=c.length?new Date(c[c.length-1].time).getTime():Date.now();playNext()}catch(e){setNow('No calls available')}}
  async function stop(){st.sys=null;st.queue=[];st.playing=false;st.paused=false;setPaused(false);if(st.sound){await st.sound.unloadAsync();st.sound=null}}
  async function toggle(){st.paused=!st.paused;setPaused(st.paused);if(st.sound){if(st.paused)await st.sound.pauseAsync();else{const s=await st.sound.getStatusAsync();if(s.isLoaded&&!s.didJustFinish&&s.positionMillis<s.durationMillis)await st.sound.playAsync();else{st.playing=false;playNext()}}}else if(!st.paused)playNext()}
  async function nearMe(){const {status:p}=await Location.requestForegroundPermissionsAsync();if(p!=='granted'){setStatus('Location denied');return}
    const pos=await Location.getCurrentPositionAsync({});const [a]=await Location.reverseGeocodeAsync(pos.coords);
    const county=(a?.subregion||a?.city||'').replace(/ County$/,'');const hit=systems.some(s=>[s.name,s.city,s.county].join(' ').toLowerCase().includes(county.toLowerCase()));
    setQ(hit?county:(a?.region||''));}
  return(<SafeAreaView style={S.root}><StatusBar barStyle="light-content"/>
    <View style={S.head}><Text style={S.h1}>Scanner Finder</Text>
      <TextInput style={S.in} value={q} onChangeText={setQ} placeholder="Search city, county, state, or name" placeholderTextColor="#6b7782"/>
      <View style={S.row}><Btn sec t="Near me" on={nearMe}/><Btn sec t={'Active only: '+(activeOnly?'on':'off')} on={()=>setActiveOnly(!activeOnly)}/></View>
      <Text style={S.sub}>{status||`${list.length} of ${systems.length} systems`}</Text></View>
    <FlatList data={list} keyExtractor={s=>s.shortName} contentContainerStyle={{paddingBottom:cur?260:20}} renderItem={({item:s})=>
      <TouchableOpacity style={S.item} onPress={()=>start(s)}><Text style={S.b}>{isActive(s)?'● ':''}{s.name}</Text>
      <Text style={S.sub}>{[s.city,s.county,s.state].filter(Boolean).join(', ')}{s.description?' · '+s.description:''}</Text></TouchableOpacity>}/>
    {cur&&<View style={S.player}><Text style={S.b}>{cur.name}</Text><Text style={S.sub}>{now}</Text>
      <View style={S.row}><Btn t={paused?'Play':'Pause'} on={toggle}/><Btn sec t="Stop" on={async()=>{await stop();setCur(null)}}/></View>
      {log.slice(0,6).map((l,i)=><Text key={i} style={S.log}>{l}</Text>)}</View>}
  </SafeAreaView>);}
const Btn=({t,on,sec})=><TouchableOpacity onPress={on} style={[S.btn,sec&&{backgroundColor:'#222c37'}]}><Text style={{color:'#fff'}}>{t}</Text></TouchableOpacity>;
const S=StyleSheet.create({root:{flex:1,backgroundColor:'#0f1419'},head:{padding:16,borderBottomWidth:1,borderColor:'#222a33'},h1:{color:'#e6e9ec',fontSize:20,fontWeight:'700',marginBottom:10},
in:{backgroundColor:'#18202a',color:'#e6e9ec',borderRadius:10,padding:12,fontSize:16,borderWidth:1,borderColor:'#2c3640'},row:{flexDirection:'row',gap:8,marginTop:8},
btn:{backgroundColor:'#1e6fd9',borderRadius:10,paddingVertical:10,paddingHorizontal:14},sub:{color:'#8b96a1',fontSize:13,marginTop:4},
item:{padding:14,borderBottomWidth:1,borderColor:'#1d252e'},b:{color:'#e6e9ec',fontWeight:'600',fontSize:16},
player:{position:'absolute',bottom:0,left:0,right:0,backgroundColor:'#161e27',borderTopWidth:1,borderColor:'#2c3640',padding:16,paddingBottom:34},log:{color:'#aab4be',fontSize:12,marginTop:2}});
