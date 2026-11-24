/* Small WebGL 1 cel-shaded sky background. Visual only; no game or network state. */
window.SkyRenderer=(()=>{
 const reduce=matchMedia('(prefers-reduced-motion: reduce)');
 const saved=localStorage.getItem('guess_quality_v1');
 let quality=['high','medium','low'].includes(saved)?saved:((navigator.hardwareConcurrency||4)<=4?'medium':'high');
 let mood=0,moodTarget=0,preset='cloud',gl=null,program=null,canvas=null,frame=0,last=0,elapsed=0,slow=0,samples=0,auto=!saved,failed=false;
 const palettes={
  sunset:[[.71,.52,.75],[.98,.68,.62],[1.,.84,.58]],
  aurora:[[.13,.24,.48],[.30,.65,.68],[.72,.84,.83]],
  ocean:[[.24,.61,.77],[.53,.81,.87],[.82,.95,.90]],
  cloud:[[0.52,0.78,0.96],[0.83,0.91,1.0],[1.0,0.80,0.76]],
  pink:[[0.96,0.68,0.78],[1.0,0.84,0.86],[1.0,0.90,0.74]],
  glass:[[0.40,0.48,0.72],[0.68,0.72,0.91],[0.90,0.80,0.91]],
  marble:[[0.58,0.72,0.79],[0.79,0.89,0.90],[0.97,0.89,0.80]]
 };
 function shader(type,src){const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error('shader');return s}
 function init(){
  canvas=document.createElement('canvas');canvas.id='sky-canvas';canvas.setAttribute('aria-hidden','true');document.body.prepend(canvas);
  try{
   gl=canvas.getContext('webgl',{alpha:false,antialias:false,powerPreference:'low-power'});if(!gl)throw Error('WebGL unavailable');
   program=gl.createProgram();
   gl.attachShader(program,shader(gl.VERTEX_SHADER,'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}'));
   gl.attachShader(program,shader(gl.FRAGMENT_SHADER,`precision mediump float;
uniform vec2 r;
uniform float t;
uniform float detail;
uniform vec3 topc,midc,lowc;

float hash21(vec2 p){
 p=fract(p*vec2(123.34,456.21));
 p+=dot(p,p+45.32);
 return fract(p.x*p.y);
}

float cloud(vec2 p){
 return sin(p.x*2.9+sin(p.y*2.3))*0.16+sin(p.x*4.8+p.y*2.7)*0.08+sin(p.x*1.4-p.y*1.9)*0.15;
}

float sparkleLayer(vec2 q, float scale, float time){
 vec2 g=q*scale;
 vec2 id=floor(g);
 vec2 f=fract(g)-0.5;
 float h=hash21(id);
 if(h<0.74) return 0.0;
 vec2 offset=vec2(hash21(id+11.7)-0.5, hash21(id+27.3)-0.5)*0.62;
 float d=length(f-offset);
 float twinkle=0.55+0.45*sin(time*(1.4+h*2.2)+h*6.2831);
 float core=1.0-smoothstep(0.015,0.11,d);
 float halo=(1.0-smoothstep(0.02,0.24,d))*0.32;
 return (core+halo)*twinkle;
}

void main(){
 vec2 p=gl_FragCoord.xy/r;
 float y=p.y;
 vec3 col=mix(lowc,midc,smoothstep(0.05,0.55,y));
 col=mix(col,topc,smoothstep(0.42,1.0,y));
 vec2 q=vec2(p.x*r.x/r.y,p.y);
 // Cel-shaded drifting ribbon & cloud bands
 float w=cloud(q*2.2+vec2(t*.010,0.));
 float ribbon=1.-smoothstep(.0,.032,abs(y-(.34+w*.19)));
 col=mix(col,vec3(1.,.98,.92),ribbon*.28);
 float c1=cloud(q*2.8+vec2(t*.014,1.1))+y*.56;
 float band1=smoothstep(.50,.53,c1);
 float band2=smoothstep(.64,.67,c1);
 col=mix(col,vec3(1.,.96,.92),band1*.16);
 col=mix(col,vec3(1.,.99,.96),band2*.12);
 // Organic hashed sparkles (no grid pattern) on high quality
 if(detail>1.5){
  float s=sparkleLayer(q+vec2(t*.006, -t*.004), 5.5, t)
        + sparkleLayer(q+vec2(-t*.004, t*.005)+vec2(3.1,7.4), 8.5, t*1.15)*0.65;
  col+=vec3(1.,.98,.92)*s*0.28;
 }
 gl_FragColor=vec4(col,1.);
}`));
   gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error('link');
   gl.useProgram(program);
   const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
   const p=gl.getAttribLocation(program,'p');gl.enableVertexAttribArray(p);gl.vertexAttribPointer(p,2,gl.FLOAT,false,0,0);
   canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();failed=true;stop();apply()});
  }catch{failed=true}
  apply();
 }
 function stop(){if(frame)cancelAnimationFrame(frame);frame=0;last=0}
 function apply(){stop();const fallback=failed||quality==='low'||reduce.matches;document.body.classList.toggle('sky-fallback',fallback);if(canvas)canvas.hidden=fallback;if(!fallback&&!document.hidden)frame=requestAnimationFrame(draw)}
 function draw(ms){
  frame=0;if(document.hidden||reduce.matches||quality==='low'||failed)return;
  const interval=quality==='high'?1000/60:1000/30;
  if(last&&ms-last<interval-2){frame=requestAnimationFrame(draw);return}
  if(auto&&last&&++samples>30&&samples<100){
   if(ms-last>55)slow++;
   if(samples===99){
    if(slow>45){quality='low';localStorage.setItem('guess_quality_v1',quality);auto=false;apply();return}
    localStorage.setItem('guess_quality_v1',quality);auto=false;
   }
  }
  const dt=last?Math.min(.1,(ms-last)/1000):0;last=ms;
  const dpr=Math.min(devicePixelRatio||1,quality==='high'?2:1.25),w=Math.max(1,Math.round(innerWidth*dpr)),h=Math.max(1,Math.round(innerHeight*dpr));
  if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;gl.viewport(0,0,w,h)}
  const original=palettes[preset]||palettes.cloud;
  mood+=(moodTarget-mood)*.035;
  const evening=[[.62,.48,.71],[.98,.68,.64],[1.,.85,.58]];
  const c=original.map((v,i)=>v.map((x,j)=>x*(1-mood)+evening[i][j]*mood));
  gl.uniform2f(gl.getUniformLocation(program,'r'),w,h);
  elapsed+=dt*(1+mood*.25);gl.uniform1f(gl.getUniformLocation(program,'t'),elapsed);
  gl.uniform1f(gl.getUniformLocation(program,'detail'),quality==='high'?2:1);
  ['topc','midc','lowc'].forEach((k,i)=>gl.uniform3fv(gl.getUniformLocation(program,k),c[i]));
  gl.drawArrays(gl.TRIANGLES,0,3);
  frame=requestAnimationFrame(draw);
 }
 function setQuality(v){if(!['high','medium','low'].includes(v))return;quality=v;auto=false;localStorage.setItem('guess_quality_v1',v);apply()}
 function setPreset(v){preset=palettes[v]?v:'cloud';document.body.dataset.theme=preset}
 document.addEventListener('visibilitychange',apply);reduce.addEventListener?.('change',apply);init();
 return {setQuality,setPreset,setMood:v=>{moodTarget=v?1:0;document.body.classList.toggle('sky-intense',!!v)},getQuality:()=>quality,isFallback:()=>failed||quality==='low'||reduce.matches};
})();
