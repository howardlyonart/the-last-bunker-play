// Layered low-frequency transients and filtered noise, with a shared short room tail.
// The compressor keeps overlapping cannon bursts and explosions controlled.
export class CinematicAudio {
  constructor(context){
    this.context=context;this.enabled=true;this.times=new Map();this.buffers=new Map();
    this.master=context.createGain();this.master.gain.value=.68;
    const limiter=context.createDynamicsCompressor();limiter.threshold.value=-16;limiter.knee.value=18;limiter.ratio.value=4;limiter.attack.value=.003;limiter.release.value=.25;
    this.bus=context.createGain();this.bus.connect(limiter);limiter.connect(this.master);this.master.connect(context.destination);
    const room=context.createConvolver(),impulse=context.createBuffer(2,Math.ceil(context.sampleRate*2),context.sampleRate);
    for(let c=0;c<2;c++){const data=impulse.getChannelData(c);for(let i=0;i<data.length;i++){const t=i/data.length;data[i]=(Math.random()*2-1)*(1-t)**3*(i<context.sampleRate*.018?.1:1);}}
    room.buffer=impulse;const roomFilter=context.createBiquadFilter();roomFilter.type='lowpass';roomFilter.frequency.value=4200;const wet=context.createGain();wet.gain.value=.18;this.bus.connect(roomFilter);roomFilter.connect(room);room.connect(wet);wet.connect(limiter);
  }
  loadGravityShot(url='./audio/gravity-fire.wav'){
    if(this.gravitySampleLoad)return this.gravitySampleLoad;
    if(typeof this.context.decodeAudioData!=='function')return Promise.resolve(false);
    this.gravitySampleLoad=fetch(url).then(response=>{if(!response.ok)throw new Error('Sample unavailable');return response.arrayBuffer();}).then(data=>this.context.decodeAudioData(data)).then(buffer=>{this.gravitySample=buffer;return true;}).catch(()=>{this.gravitySampleLoad=null;return false;});return this.gravitySampleLoad;
  }
  gravityShot(){
    if(!this.gravitySample)return false;
    const source=this.context.createBufferSource(),gain=this.context.createGain();source.buffer=this.gravitySample;gain.gain.value=1.35;source.connect(gain);gain.connect(this.bus);source.onended=()=>{source.disconnect();gain.disconnect();};source.start(this.context.currentTime);return true;
  }
  loadLightningShot(url='./audio/lightning-energy-burst.mp3'){
    if(this.lightningSampleLoad)return this.lightningSampleLoad;
    if(typeof this.context.decodeAudioData!=='function')return Promise.resolve(false);
    this.lightningSampleLoad=fetch(url).then(response=>{if(!response.ok)throw new Error('Sample unavailable');return response.arrayBuffer();}).then(data=>this.context.decodeAudioData(data)).then(buffer=>{this.lightningSample=buffer;return true;}).catch(()=>{this.lightningSampleLoad=null;return false;});return this.lightningSampleLoad;
  }
  lightningShot(){
    if(!this.lightningSample)return false;
    // New cinematic sample: -0.8 dBFS peak, -16.3 dBFS mean. No old layers.
    const source=this.context.createBufferSource(),gain=this.context.createGain();source.buffer=this.lightningSample;gain.gain.value=.45;source.connect(gain);gain.connect(this.bus);source.onended=()=>{source.disconnect();gain.disconnect();};source.start(this.context.currentTime);return true;
  }
  unlock(){
    if(!this.enabled)return Promise.resolve(false);
    if(this.context.state==='running')return Promise.resolve(true);
    if(this.context.state==='closed')return Promise.reject(new Error('Audio output closed'));
    if(this.resuming)return this.resuming;
    // Call resume synchronously from the user's tap, including iOS's interrupted state.
    try{const result=this.context.resume();this.resuming=Promise.resolve(result).then(()=>this.context.state==='running').finally(()=>{this.resuming=null;});return this.resuming;}
    catch(error){return Promise.reject(error);}
  }
  setEnabled(enabled){this.enabled=enabled;if(!enabled)this.setUfoActive(false);this.master.gain.value=enabled?.68:0;}
  envelope(gain,volume,duration,delay=0,attack=.003){const t=this.context.currentTime+delay;gain.gain.setValueAtTime(.001,t);gain.gain.linearRampToValueAtTime(volume,t+attack);gain.gain.exponentialRampToValueAtTime(.001,t+duration);return t;}
  bass(start,end,duration,volume,delay=0){
    const a=this.context,source=a.createOscillator(),gain=a.createGain();source.type='sine';source.connect(gain);gain.connect(this.bus);const t=this.envelope(gain,volume,duration,delay);source.frequency.setValueAtTime(start,t);source.frequency.exponentialRampToValueAtTime(Math.max(18,end),t+duration);source.onended=()=>{source.disconnect();gain.disconnect();};source.start(t);source.stop(t+duration+.01);
  }
  texture(duration,volume,start,end,delay=0,attack=.004){
    const a=this.context,key=2.5;
    if(!this.buffers.has(key)){const b=a.createBuffer(1,Math.ceil(a.sampleRate*key),a.sampleRate),d=b.getChannelData(0);let brown=0;for(let i=0;i<d.length;i++){const white=Math.random()*2-1;brown=(brown+white*.045)/1.025;d[i]=white*.5+brown*2;}this.buffers.set(key,b);}
    const source=a.createBufferSource(),filter=a.createBiquadFilter(),gain=a.createGain();source.buffer=this.buffers.get(key);filter.type='lowpass';filter.Q.value=.7;source.connect(filter);filter.connect(gain);gain.connect(this.bus);const t=this.envelope(gain,volume,duration,delay,attack);filter.frequency.setValueAtTime(start,t);filter.frequency.exponentialRampToValueAtTime(Math.max(40,end),t+duration);source.playbackRate.value=.94+Math.random()*.1;source.onended=()=>{source.disconnect();filter.disconnect();gain.disconnect();};source.start(t);source.stop(t+duration+.02);
  }
  mechanical(){
    this.texture(.035,.09,5800,1800,0);this.texture(.075,.06,2400,650,.025);this.texture(.12,.045,1100,280,.065);
    this.bass(320,125,.09,.025,.015);this.bass(170,70,.16,.04,.055);
  }
  setUfoActive(active){
    active=active&&this.enabled;if(active===!!this.hum)return;
    const a=this.context,t=a.currentTime;
    if(!active){if(this.hum){this.hum.gain.gain.setValueAtTime(.035,t);this.hum.gain.gain.exponentialRampToValueAtTime(.001,t+.12);for(const osc of this.hum.sources)osc.stop(t+.14);this.hum=null;}return;}
    const gain=a.createGain();gain.gain.value=.035;gain.connect(this.bus);const sources=[];
    for(const hz of [43,45.5,86]){const osc=a.createOscillator();osc.type='sine';osc.frequency.value=hz;osc.connect(gain);osc.start();sources.push(osc);}
    const lfo=a.createOscillator(),depth=a.createGain();lfo.frequency.value=1.7;depth.gain.value=.018;lfo.connect(depth);depth.connect(gain.gain);lfo.start();sources.push(lfo);let remaining=sources.length;for(const osc of sources)osc.onended=()=>{osc.disconnect();if(--remaining===0){depth.disconnect();gain.disconnect();}};this.hum={gain,sources};
  }
  explosion(scale=1,cold=false){
    this.bass(95,27,.7,.23*scale);this.bass(49,22,.95,.13*scale,.02);
    this.texture(.22,.22*scale,cold?5600:3000,700);this.texture(.75,.15*scale,800,100,.015,.015);
    if(cold){this.bass(1430,1330,.26,.025,.035);this.texture(.4,.075,7200,2800,.045);}
  }
  play(type,data={}){
    if(!this.enabled||this.context.state!=='running')return;
    const now=this.context.currentTime,interval={shot:.05,destroy:.06,ricochet:.07,'photon-explosion':.06,photon:.1,'missile-impact':.08,'ground-impact':.08,'drone-shot':.07,'mine-drop':.1}[type]||0;
    if(now-(this.times.get(type)??-10)<interval)return;this.times.set(type,now);
    switch(type){
      case 'shield-up':this.bass(240,480,.5,.09);this.texture(.35,.06,600,2400);break;
      case 'shield-hit':this.bass(170,65,.35,.14);this.texture(.24,.1,4800,900);break;
      case 'shield-down':this.texture(.45,.09,2600,160);break;
      case 'sound-check':this.bass(660,440,.22,.16);this.bass(440,660,.22,.13,.18);break;
      case 'shot':if(data.weapon==='acid'){this.bass(100,38,.2,.14);this.texture(.16,.12,1900,380);this.mechanical();break;}this.bass(105,32,.23,.23);this.bass(52,25,.32,.1,.01);this.texture(.085,.17,4300,750);this.mechanical();break;
      case 'burst':this.explosion(.75);break;
      case 'charge-wave':this.explosion(1.2,true);this.texture(.9,.12,3200,180,.02);break;
      case 'drone-up':case 'minelayer-up':case 'turret-level2':case 'asteroid-turret':this.bass(150,330,.3,.055);this.texture(.2,.045,1900,650);break;
      case 'drone-shot':this.texture(.045,.025,4100,1600);this.bass(260,110,.07,.025);break;
      case 'mine-drop':this.texture(.07,.035,1000,220);break;
      case 'mine-explosion':case 'mount-destroyed':this.explosion(.9);break;
      case 'seeker-shot':this.bass(95,28,.4,.2);this.texture(.18,.14,2400,350);this.mechanical();break;
      case 'repulser-shot':this.explosion(1.3,true);this.texture(.85,.12,3400,180);break;
      case 'chain-shot':this.bass(92,28,.32,.2);this.texture(.16,.12,3200,600);this.texture(.3,.06,5200,1400,.045);this.mechanical();break;
      case 'thruster-shot':this.texture(.3,.12,900,3400);this.bass(110,35,.25,.13);break;
      case 'thruster-attach':this.texture(.12,.09,2500,450);this.texture(.45,.045,1800,800,.02);break;
      case 'thruster-clear':this.bass(240,470,.2,.035);break;
      case 'mount-shot':this.bass(125,42,.24,.14);this.texture(.12,.12,3200,850);break;
      case 'freeze':this.texture(.48,.18,6800,1100);this.texture(.16,.12,11000,4200);this.bass(98,34,.25,.13);break;
      case 'freeze-shatter':this.texture(.13,.24,10000,1800);this.texture(.4,.1,5500,600,.025);this.bass(80,32,.18,.15);break;
      case 'lightning':if(!this.lightningShot()){this.texture(.24,.13,5000,900,.01);this.bass(240,80,.22,.11);}break;
      case 'turret-shot':this.bass(100,38,.16,.045);this.texture(.08,.04,2500,650);break;
      case 'turret-upgrade':this.bass(95,145,.45,.05);this.texture(.2,.035,1800,600);break;
      case 'turret-destroyed':this.explosion(1.2,true);break;
      case 'gravity-shot':if(!this.gravityShot()){this.bass(70,24,.7,.22);this.texture(.45,.12,1000,140,.03);}break;
      case 'black-hole':this.bass(48,18,1.5,.19);this.texture(1.6,.12,800,75,0,.045);break;
      case 'missile':this.bass(80,30,.5,.13);this.texture(.5,.16,900,3700,0,.018);this.texture(.22,.07,3400,800,.04);break;
      case 'missile-impact':this.explosion(.95);break;
      case 'impact':this.explosion(1.1);this.texture(1.1,.08,220,55,.03);break;
      case 'ground-impact':this.explosion(.6);this.texture(.55,.08,500,110,.07);break;
      case 'destroy':this.bass(100,38,.25,.11);this.texture(.2,.1,1800,450);break;
      case 'ricochet':this.bass(910,840,.11,.018);this.bass(1720,1570,.09,.012);this.texture(.065,.035,5500,2600);break;
      case 'comet':this.texture(.7,.07,400,3600,0,.08);this.bass(57,42,.8,.06);break;
      case 'comet-explosion':this.explosion(1,true);break;
      case 'ufo':this.bass(72,61,1,.055);this.bass(110,104,.8,.025);this.texture(.65,.025,1400,380);break;
      case 'ufo-down':this.texture(.7,.1,2200,220);this.bass(140,38,.8,.12);break;
      case 'ufo-explosion':this.explosion(1.5,true);this.texture(1.1,.12,400,70,.04);break;
      case 'photon':this.bass(380,72,.22,.09);this.bass(90,32,.3,.06);this.texture(.16,.07,3800,550);break;
      case 'photon-explosion':this.bass(118,35,.3,.085);this.texture(.18,.08,4200,950);break;
      case 'upgrade':this.bass(108,160,.5,.055);this.texture(.35,.025,700,2300);break;
      case 'wave':this.bass(52,35,.65,.08);this.texture(.45,.025,300,90);break;
    }
  }
}
