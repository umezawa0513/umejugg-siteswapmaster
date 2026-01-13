/*
html中に書く場合
<center id="simConteiner"><center>
<script src="https://umejugg.com/siteswapmaster/shortSimGene.js"></script>
<script>cSA(simConteiner,"531")</script>

script中に書く場合
var centerElement = document.createElement('center');
centerElement.id = 'simConteiner';
document.body.appendChild(centerElement);
var script = document.createElement('script');
script.src = 'https://umejugg.com/siteswapmaster/shortSimGene.js';
document.head.appendChild(script);
cSA(simConteiner,"531");
*/

function cSA(d,s){
    d.innerHTML=` 
    <div><canvas id="canvas" width="300" height="500" style="background-color: dimgrey;"></canvas></div>
    <div><input type="range" id="SR" min="0" max="100" value="30"></div>`;
    FS(s)
}
function FS($){let e=document.querySelector("#SR").value/10,l="#FFFFFF",_="#000000",n=null,o=null,u=null,h=[],a=[],f=[],s,g,c=x2=x3=x4=null,
p=null,v=0,z1=400,T,y,P,b,S,R=[],m=[];function x($,l,_,n){let o=$[0]-1,u=$[4],a=$[3];a-u||(u+=.1);let f=u-a,s=a+$[1],g=f/(o*P);o||(g=f/1);
let c=z1-10*(o+1)**2/p;o-1||(c=z1-10*(o+25.5/(S-b))**2/p);let v=(a+u)/2,T=(c-z1)/((v-a)*(v-u))*((s+=g*l*e)-a)*(s-u)+z1;
T<=401&&(ctx.beginPath(),ctx.arc(s,T,_,0,2*Math.PI),ctx.fill()),h[n]=[$[0],s-a,T,$[3],$[4]]}function F($,l,_,n){let o=$[4],u=$[3];
u==o&&(o+=.1);let h=o-u,f=u+$[1],s=(u+o)/2,g=-((z1-10*(1+25.5/(S-b))**2/p-z1)/((s-u)*(s-o)))*((f+=h/(1*P)*l*e)-u)*(f-o)+z1;
ctx.beginPath(),ctx.arc(f,g,_,0,2*Math.PI),ctx.fill(),a[n]=[$[0],f-u,g,$[3],$[4]]}function L($,n,o){let u,h,a=$[4],s=$[3],
g={RU:[1,-1],RD:[-1,-1],LU:[1,1],LD:[-1,1]}[$[0]];u=g[0],h=g[1],s-a||(a+=.1);let c=a-s,v=s+$[1],T=(s+a)/2,y=u*((z1-10*(1+25.5/(S-b))**2/p-z1)/((T-s)*(T-a)))*((v+=c/(1*P)*n*e)-s)*(v-a)+z1;
ctx.beginPath(),ctx.moveTo(v,y),ctx.lineTo((w=width/2)+(r=h*(S-b))/.9-(v-w)/5,z1-(t=S-b)/1.7+(y-z1)/7),ctx.stroke(),ctx.beginPath(),
ctx.moveTo(w+r/.9-(v-w)/5,z1-t/1.7+(y-z1)/7),ctx.lineTo(w+r/2,z1-1.6*t),ctx.lineTo(w+r/12,z1-1.7*t),ctx.stroke(),ctx.beginPath(),
ctx.fillStyle=_,ctx.fill(),ctx.arc(w+r/.9-(v-w)/5,z1-t/1.7+(y-z1)/7,.113*t,0,2*Math.PI),ctx.fill(),ctx.fillStyle=l,f[o]=[$[0],v-s,y,s,a]}
function D(U){if(!0==o){ctx.fillStyle=l;let I=FM(n);for(i=0,x2=(r=width/2)-(w=170/(I=I>=5?I:5))|0,x3=r+w|0,p=10*I**2/370,x4=(x3-r)*1.5+x3|0,
c=x2-(x3-r)*1.5|0,S=((b=r+w)-r)*1.5+x3,s=FI(n),h=[],a=[],f=[],v=0,T=1,y=0,P=0,R=[];i<36;i++)R.push("_");for(i=0,m=[];i<36;i++)m.push("_");
ctx.lineWidth=(S-b)/5}if(!1!=o){g||(g=U),dt=(U-g)/1e3,g=U,ctx.clearRect(0,0,width,height),ctx.beginPath(),ctx.fill();let z=[];
for(let E=0;E<h.length;E++)h[E][2]>z1||z.push(h[E]);h=z;let B=[];for(let C=0;C<a.length;C++)a[C][2]<z1||B.push(a[C]);a=B;let H=[];
for(let M=0;M<f.length;M++)(f[M][2]>=z1&&"RU"!=f[M][0]&&"LU"!=f[M][0]||f[M][2]<=z1&&"RD"!=f[M][0]&&"LD"!=f[M][0])&&H.push(f[M]);
for(f=H,ctx.strokeStyle=_,ctx.beginPath(),ctx.arc(w=width/2,z1-2.5*(r=S-b)+r/6,r/1.5-r/6,0,2*Math.PI),ctx.stroke(),ctx.beginPath(),
ctx.moveTo(w,z1-2.5*r+r/1.5),ctx.lineTo(w,z1),ctx.lineTo(w+.6*r,z1+3*r/2),ctx.lineTo(w+r,z1+3*r),ctx.lineTo(w+.9*r,z1+3*r),
ctx.lineTo(w+.6*r,z1+3*r/2),ctx.stroke(),ctx.beginPath(),ctx.moveTo(w,z1),ctx.lineTo(w-.6*r,z1+3*r/2),ctx.lineTo(w-r,z1+3*r),
ctx.lineTo(w-.9*r,z1+3*r),ctx.lineTo(w-.6*r,z1+3*r/2),ctx.stroke(),ctx.fillStyle=l,ctx.font="30px serif",ctx.fillText($,0,height),
i=f.length;i--;L(f[i],dt,i));for(i=h.length;i--;x(h[i],dt,FB(n),i));for(i=a.length;i--;F(a[i],dt,FB(n),i));(T+=dt*e)-y>1&&(R.shift(),R.push("_"),
R[s[v%(r=s.length)][0]]=s[w=v%r][4],m.shift(),m.push("_"),m[s[w][0]]=s[w][0],q=(v+1)%r,1!=m[1]&&"_"!=R[1]&&a.push([m[1],0,z1,R[1],s[q][3]]),
s[w][0]&&h.push(s[w]),s[q][0]-1||(R[2]=s[q][4]),v%2?(f.push(["RD",0,z1,c,x2]),f.push(["LU",0,z1,x3,x4])):(f.push(["RU",0,z1,x2,c]),
f.push(["LD",0,z1,x4,x3])),v+=1,P=T-y,y=T),u=requestAnimationFrame(D)}!1==o&&(u=null,ctx.clearRect(0,0,width,height)),o=null}
function U($,e){n=$,o=e,null==u&&(u=requestAnimationFrame(D))}ctx=(canvas=document.getElementById("canvas")).getContext("2d"),
width=canvas.width,height=canvas.height,DC={0:0,1:1,2:2,3:3,4:4,5:5,6:6,7:7,8:8,9:9,a:10,b:11,c:12,d:13,e:14,f:15,g:16,h:17,
i:18,j:19,k:20,l:21,m:22,n:23,o:24,p:25,q:26,r:27,s:28,t:29,u:30,v:31,w:32,x:33,y:34,z:35,A:10,B:11,C:12,D:13,E:14,F:15,G:16,H:17,
I:18,J:19,K:20,L:21,M:22,N:23,O:24,P:25,Q:26,R:27,S:28,T:29,U:30,V:31,W:32,X:33,Y:34,Z:35},FC=$=>{for(i=r=$.length,t=new Set;
i--;t.add(($[i]+i+1)%r));return!!(t.size-r||$.reduce(($,e)=>$+e)/r%1)},FV=$=>{for(i=$.length;i--;)if(!($[i]in DC))return!0;return!1},
FM=$=>Math.max(...$),FB=$=>FM($)/5|0?80/FM($):16,FI=$=>{for($.length%2-1||($=$.concat($)),k=[],i=0;i<$.length;i++)k.push([r=$[i],0,z1,
i%2?x3:x2,r%2^i%2?r-1?x4:x3:r-1?c:x2]);return k},document.querySelector("#SR").addEventListener("input",function $(l){e=l.target.value/10},!1),
!function $(e){let l=e.split(""),_=[];for(i=0;i<(r=l.length);i++)_.push(DC[l[i]]);let n=[0];FV(l)?U(n,!0):r?r>100?U(n,!0):FC(_)?U(n,!0):U(_,!0):U(n,!0)}($)}