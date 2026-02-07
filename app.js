// CONFIG ---------------------------------------
const ROUND_TIME_SECONDS = 15; // change to 10/20 for difficulty

//  DATASET (curate messages + explanations) ---
const SAMPLES = [
  // PHISH
  { id: 1,  title: "Payroll: IBAN confirmation required", text: "Finance: We couldn’t confirm your IBAN for this month’s salary. To avoid delay, verify your bank details here within 2 hours: https://payroll-secure-update.com/employee", label: "phish", explanation: "Urgent pressure + lookalike domain + asks for credentials/payment info." },
  { id: 2,  title: "Reply-chain invoice (thread hijack)", text: "Re: PO #11827 — Following up on the attached invoice. New beneficiary details are in the link below. Please process today.", label: "phish", explanation: "Hijacked reply subject + asks to change beneficiary details; classic vendor fraud." },
  { id: 3,  title: "Single-use sign-in", text: "Security: Your session expired. Login with single-use link to continue work: https://auth.my-portal-login.co/security", label: "phish", explanation: "Lookalike multi-subdomain domain + login demand." },
  { id: 4,  title: "Delivery QR code", text: "Courier: We couldn’t deliver your package. Scan the QR to pay 7 SAR re-delivery fee and schedule a new time. (QR attached)", label: "phish", explanation: "QR code (QRishing) + small payment request to capture card credentials." },
  { id: 5,  title: "Boss urgent cards", text: "Are you at the office? I need 6 Apple gift cards for a client now. Scratch and send the codes in the next 10 minutes.", label: "phish", explanation: "Boss impersonation + gift-card request + urgency." },
  { id: 6,  title: "MFA fatigue push", text: "IT Notice: You’ll receive several MFA prompts today due to a system update. Tap ‘Approve’ so we can complete the upgrade.", label: "phish", explanation: "Tries to trick you into approving fraudulent MFA; social engineering." },
  { id: 7,  title: "Bank SMS — Arabic", text: "بنكك: لإلغاء تحويل مشتبه به، سجّل دخولك الآن: http://mybank-help.verify-secure.net\nلا تُشارك كلمة المرور أو الرمز.", label: "phish", explanation: "Arabic lure + lookalike domain + asks to login now." },
  { id: 8,  title: "Punycode brand", text: "Security check: visit https://xn--paypaI-3ve.com to verify ownership or your account will be locked.", label: "phish", explanation: "Punycode lookalike domain + urgency + verification ask." },
  { id: 9,  title: "Shared doc request (Drive)", text: "You were added to ‘Salary_Adjustment_2025.xlsx’. View now to confirm: https://drive-share-docs.co/view?id=8f32", label: "phish", explanation: "Fake document-sharing host; pushes quick login." },
  { id: 10, title: "SADAD bill correction", text: "Finance: SADAD reference needs correction. Pay 9 SAR difference via link to keep your service active today.", label: "phish", explanation: "Small urgent payment via link to capture card/credentials." },
  { id: 11, title: "University account reset", text: "KSU IT: Your password expires today. Reset immediately to avoid lockout: https://ksu-login-reset.net", label: "phish", explanation: "Looks like the university; off-domain reset page + urgency." },

  // SAFE
  { id: 12, title: "Legit MFA block", text: "Microsoft account sign-in: A login was blocked due to an incorrect password. If this was you, no action is needed. Review activity from your official security page.", label: "safe", explanation: "No link and no password request; instructs you to use official page." },
  { id: 13, title: "Routine maintenance", text: "IT will perform maintenance 03:00–04:00 tonight. Services may be briefly unavailable. No action is required.", label: "safe", explanation: "Neutral tone; routine notice; no credentials or links." },
  { id: 14, title: "Internal project note", text: "Team, design assets are in the internal shared drive (no external links). Please review before the 10:00 meeting.", label: "safe", explanation: "Internal reference; no external links; no requests for passwords." },
  { id: 15, title: "Courier locker code", text: "Your package arrived at the locker. Use code 7142 on the screen. This message contains no links.", label: "safe", explanation: "No links, no credential request; standard pickup code." },
  { id: 16, title: "Bank OTP", text: "Your verification code is 482917. Do not share it with anyone. The bank will never ask for this code via phone or email.", label: "safe", explanation: "OTP message says do-not-share; danger only if someone asks you to send it." },
  { id: 17, title: "SSO migration advisory", text: "We’re migrating to SSO next week. Continue using the official portal; no password reset emails will be sent.", label: "safe", explanation: "Legit advisory; explicitly says no reset links." },

  // Hard mode
  { id: 18, title: "Vendor bank change request", text: "Hello, accounting asked us to update our bank details due to an audit. Please use the new IBAN starting this cycle. Attachment has the stamped letter.", label: "phish", explanation: "Classic BEC/vendor fraud: beneficiary change via email; verify out-of-band." },
  { id: 19, title: "Calendar invite clean", text: "Meeting: ‘Quarterly review’ added to your calendar. Join from your usual Teams/Meet link in the invite. No action required.", label: "safe", explanation: "Normal calendar invite; no credential request; uses usual platform." },
  { id: 20, title: "Security awareness check", text: "Reminder: Do not enter passwords on pages reached by short links. Use bookmarked URLs or the official app only.", label: "safe", explanation: "Educational notice; no links; no urgent ask." }
];

//  GAME STATE & DOM CACHE -----------------------
let deck = [], idx = 0, correct = 0, attempted = 0;
let playerName = "Player";
let timeLeft = ROUND_TIME_SECONDS, timerId = null, roundLocked = false;

const $ = (s) => document.querySelector(s);
const startSec = $("#start"), gameSec = $("#game"), finishSec = $("#finish");
const playerNameInp = $("#playerName"), roundsInp = $("#rounds");
const progressEl = $("#progress"), progressBar = $("#progressBar");
const titleEl = $("#title"), msgEl = $("#msg");
const choiceBtns = document.querySelectorAll(".choice");
const afterBox = $("#after"), resultEl = $("#result"), explainEl = $("#explain"), btnNext = $("#btnNext");
const statsEl = $("#stats"), leaderName = $("#leaderName"), btnSave = $("#btnSave"), boardEl = $("#board"), btnAgain = $("#btnAgain"), btnClear = $("#btnClear");
const timerBar = $("#timerBar"), timerLabel = $("#timerLabel");

// CONFETTI / FX ------------------------------
const fx = document.getElementById("fx");
const ctx = fx.getContext("2d", { alpha: true });
let FX_PARTICLES = [], FX_RUNNING = false;
function resizeFx() { fx.width = innerWidth; fx.height = innerHeight; }
window.addEventListener("resize", resizeFx); resizeFx();
function rand(a,b){return Math.random()*(b-a)+a;}
function spawnConfetti(x,y,count=80){
  const colors=["#ff4d4f","#ffd166","#37d67a","#6c8cff","#8a5bff","#f59e0b"];
  for(let i=0;i<count;i++){
    FX_PARTICLES.push({
      x,y,vx:rand(-3,3),vy:rand(-6,-2),g:0.1,life:rand(0.9,1.6),ttl:rand(0.9,1.6),
      size:rand(6,12),color:colors[(Math.random()*colors.length)|0]
    });
  }
  if(!FX_RUNNING) runFx();
}
function runFx(){
  FX_RUNNING=true;
  let last=performance.now();
  function frame(now){
    const dt=Math.min(0.033,(now-last)/1000); last=now;
    ctx.clearRect(0,0,fx.width,fx.height);
    for(let i=FX_PARTICLES.length-1;i>=0;i--){
      const p=FX_PARTICLES[i];
      p.ttl-=dt; if(p.ttl<=0||p.y>fx.height+50){FX_PARTICLES.splice(i,1);continue;}
      p.vy+=p.g; p.x+=p.vx; p.y+=p.vy;
      ctx.globalAlpha=Math.max(0,p.ttl/p.life);
      ctx.fillStyle=p.color;
      ctx.fillRect(p.x,p.y,p.size,p.size);
    }
    if(FX_PARTICLES.length>0) requestAnimationFrame(frame);
    else FX_RUNNING=false;
  }
  requestAnimationFrame(frame);
}
function elementCenter(el){const r=el.getBoundingClientRect();return{x:r.left+r.width/2,y:r.top+r.height/2};}
function burstAtElement(el){const{ x,y }=elementCenter(el);spawnConfetti(x,y,80);}
function burstCenterBig(){spawnConfetti(innerWidth/2,innerHeight/3,200);}

// TIMER & ROUND FLOW --------------------------
function stopTimer(){if(timerId){clearInterval(timerId);timerId=null;}}
function startTimer(){
  stopTimer(); timeLeft=ROUND_TIME_SECONDS;
  timerId=setInterval(()=>{
    if(roundLocked)return;
    timeLeft-=0.1;
    if(timeLeft<=0){timeLeft=0;onTimeout();stopTimer();}
    timerLabel.textContent=`${Math.ceil(timeLeft)}s`;
    timerBar.style.width=`${(timeLeft/ROUND_TIME_SECONDS)*100}%`;
  },100);
}
function onTimeout(){
  if(roundLocked)return; roundLocked=true; attempted++;
  const s=deck[idx]; showResult(false,s,true);
  afterBox.classList.remove("hidden"); choiceBtns.forEach(b=>b.disabled=true);
}
function submitGuess(g){
  if(roundLocked)return; roundLocked=true; stopTimer();
  const s=deck[idx]; const correctGuess=(g===s.label); attempted++; if(correctGuess)correct++;
  showResult(correctGuess,s); afterBox.classList.remove("hidden"); choiceBtns.forEach(b=>b.disabled=true);
}
function showResult(ok,s,timedOut=false){
  resultEl.textContent=timedOut?"Timed out ⏰":ok?"Correct":"Wrong";
  resultEl.className="result "+(ok?"ok":"bad");
  explainEl.textContent="Why: "+s.explanation;
  if(ok)burstAtElement(resultEl);
}
function nextOrFinish(){idx++; if(idx>=deck.length)endGame(); else loadCurrent();}

// GAME START/LOAD/END --------------------------
function shuffle(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function startGame(){
  playerName=(playerNameInp.value||"Player").trim();
  const rounds=Math.max(1,Math.min(10,parseInt(roundsInp.value||"6")));
  deck=shuffle(SAMPLES).slice(0,rounds);
  idx=0;correct=0;attempted=0;
  startSec.classList.add("hidden");finishSec.classList.add("hidden");
  gameSec.classList.remove("hidden");loadCurrent();
}
function loadCurrent(){
  if(idx>=deck.length){endGame();return;}
  const s=deck[idx]; titleEl.textContent=s.title; msgEl.textContent=s.text;
  afterBox.classList.add("hidden");choiceBtns.forEach(b=>b.disabled=false);
  roundLocked=false; progressEl.textContent=`Round ${idx+1} / ${deck.length}`;
  progressBar.style.width=`${(idx/deck.length)*100}%`; startTimer();
}
function endGame(){
  gameSec.classList.add("hidden"); finishSec.classList.remove("hidden");
  stopTimer(); const acc=attempted?Math.round((correct/attempted)*100):0;
  statsEl.textContent=`You got ${correct}/${attempted} correct. Accuracy: ${acc}%`;
  leaderName.value=playerName; renderLeaderboard(); burstCenterBig();
}

// LEADERBOARD & CONTROLS -----------------------
function saveLeaderboard(){
  const name=(leaderName.value||"Player").trim();
  const acc=attempted?Math.round(100*correct/attempted):0;
  const row={name,accuracy:acc,time:Date.now()};
  const lb=JSON.parse(localStorage.getItem("phish_lb")||"[]");
  lb.push(row); lb.sort((a,b)=>(b.accuracy-a.accuracy)||(b.time-a.time));
  localStorage.setItem("phish_lb",JSON.stringify(lb.slice(0,20)));
  renderLeaderboard(); burstAtElement(btnSave);
}
function clearLeaderboard(){
  if(!confirm("Clear all leaderboard entries?"))return;
  localStorage.removeItem("phish_lb");
  renderLeaderboard();
}
function renderLeaderboard(){
  const lb=JSON.parse(localStorage.getItem("phish_lb")||"[]");
  lb.sort((a,b)=>(b.accuracy-a.accuracy)||(b.time-a.time));
  boardEl.innerHTML=""; // no '(empty)' text anymore
  lb.forEach(r=>{
    const li=document.createElement("li");
    li.textContent=`${r.name} — ${r.accuracy}%`;
    boardEl.appendChild(li);
  });
}

// EVENT WIRING -----------------------
document.getElementById("btnStart").addEventListener("click",startGame);
document.querySelector(".choice.phish").addEventListener("click",()=>submitGuess("phish"));
document.querySelector(".choice.safe").addEventListener("click",()=>submitGuess("safe"));
document.getElementById("btnNext").addEventListener("click",nextOrFinish);
document.getElementById("btnAgain").addEventListener("click",()=>{finishSec.classList.add("hidden");startSec.classList.remove("hidden");});
document.getElementById("btnSave").addEventListener("click",saveLeaderboard);
document.getElementById("btnClear").addEventListener("click",clearLeaderboard);
renderLeaderboard();
