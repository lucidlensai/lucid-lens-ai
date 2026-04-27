const cfg=window.LLAI_CONFIG||{};
  const AT=cfg.AT||'',BASE=cfg.BASE||'',TBL=cfg.TBL||'Dreams',CRED=cfg.CRED||'Credits';
  let email='',uid='',plan='Dreamer Free',limit=0,usedMonth=0,credits=0,creditId=null,planStartDate=null;

  function openPricingModal(){document.getElementById('pricing-modal').classList.add('open');}
  function closePricingModal(){document.getElementById('pricing-modal').classList.remove('open');}
  function handleModalClick(e){if(e.target===document.getElementById('pricing-modal'))closePricingModal();}
  function buyLucidDreams(){closePricingModal();var btn=document.getElementById('ms-lucid-btn');if(btn){btn.click();}else{window.open('https://buy.stripe.com/aFa6oz62b0h38Wy2RV0Jq04','_blank');}}

  async function initMemberstack(){
    try{
      let a=0;
      while(!window.$memberstackDom&&a<20){await new Promise(r=>setTimeout(r,500));a++;}
      if(!window.$memberstackDom)return;
      const{data:m}=await window.$memberstackDom.getCurrentMember();
      if(!m)return;
      email=m.auth?.email||'';uid=m.id||'';
      const name=m.customFields?.name||email.split('@')[0]||'Dreamer';
      const first=name.split(' ')[0];
      const init=name.split(' ').map(n=>n[0]).join('').toUpperCase().slice(0,2)||'+';
      document.querySelector('.user-name').textContent=name;
      document.querySelector('.avatar').textContent=init;
      document.getElementById('profile-name').value=name;
      document.getElementById('profile-email').value=email;
      const pc=m.planConnections?.[0];
      planStartDate=pc?.startDate?new Date(pc.startDate):null;
      const pid=pc?.planId||'',prid=pc?.payment?.priceId||'';
      if(prid.includes('lucid')||pid.includes('lucid')){plan='Lucid Dreams';limit=30;}
      else if(prid.includes('dreamer-sp')||pid.includes('dreamer-sp')){plan='Lucid Dreams';limit=30;}
      else{plan='Dreamer Free';limit=0;}
      document.querySelector('.user-plan').textContent=plan;
      document.getElementById('account-plan-name').textContent=plan;
      const h=new Date().getHours();
      const g=h<12?'Good morning':h<18?'Good afternoon':'Good evening';
      document.getElementById('topbar-title').innerHTML=g+', <em style="font-style:italic;color:#c9b8f0;">'+first+'</em>';
      document.getElementById('topbar-sub').textContent='Welcome back';
      await Promise.all([loadDreams(),loadCredits()]);
      initHoroscope();
      updateUI();
      if(plan==='Dreamer Free'&&credits===0){
        var k='llai_shown_'+uid;
        if(!sessionStorage.getItem(k)){sessionStorage.setItem(k,'1');setTimeout(function(){openPricingModal();},1500);}
      }
    }catch(e){}
  }
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',initMemberstack):initMemberstack();

  async function handleSignOut(){await window.$memberstackDom.logout();window.location.href='/login';}

  async function loadDreams(){
    if(!email)return;
    try{
      var f=encodeURIComponent('{User Email}="'+email+'"');
      var res=await fetch('https://api.airtable.com/v0/'+BASE+'/'+TBL+'?filterByFormula='+f+'&sort[0][field]=Submitted At&sort[0][direction]=desc',{headers:{'Authorization':'Bearer '+AT}});
      var d=await res.json();
      var recs=d.records||[];
      var done=recs.filter(function(r){return r.fields['Status']==='Complete';}).sort(function(a,b){return new Date(b.createdTime||b.fields['Submitted At'])-new Date(a.createdTime||a.fields['Submitted At']);});
      var now=new Date(),fom;
      if(planStartDate&&limit>0){
        var dayOfCycle=(Math.floor((now-planStartDate)/(1000*60*60*24))%30+30)%30;
        fom=new Date(now-(dayOfCycle*24*60*60*1000));fom.setHours(0,0,0,0);
      }else{fom=new Date(now.getFullYear(),now.getMonth(),1);}
      var mon=recs.filter(function(r){return new Date(r.fields['Submitted At'])>=fom;});
      usedMonth=mon.length;
      document.getElementById('stat-total').textContent=done.length;
      document.getElementById('stat-images').textContent=done.filter(function(r){return r.fields['Image 1 URL'];}).length*2;
      document.getElementById('stat-audio').textContent=done.filter(function(r){return r.fields['Audio URL'];}).length;
      document.getElementById('stat-month').textContent=mon.length;
      renderDreams(done);
    }catch(e){
      document.getElementById('dreams-container').innerHTML='<div class="empty-state"><div class="empty-state-orb">&#127769;</div><h3>Could not load dreams</h3><p>Something went wrong. Please refresh.</p></div>';
    }
  }

  async function loadCredits(){
    if(!email)return;
    try{
      var f=encodeURIComponent('AND({Email}="'+email+'",{Status}="Available")');
      var res=await fetch('https://api.airtable.com/v0/'+BASE+'/'+CRED+'?filterByFormula='+f,{headers:{'Authorization':'Bearer '+AT}});
      var d=await res.json();var rc=d.records||[];
      credits=rc.length;creditId=rc[0]?rc[0].id:null;
    }catch(e){}
  }

  async function markCreditUsed(){
    if(!creditId)return;
    try{
      await fetch('https://api.airtable.com/v0/'+BASE+'/'+CRED+'/'+creditId,{method:'PATCH',headers:{'Authorization':'Bearer '+AT,'Content-Type':'application/json'},body:JSON.stringify({fields:{'Status':'Used','Used At':new Date().toLocaleDateString('en-CA')}})});
      credits--;creditId=null;await loadCredits();
    }catch(e){}
  }

  function updateUI(){
    var el=document.getElementById('dreams-left-pill');
    if(limit>0){el.innerHTML='<span>'+Math.max(0,limit-usedMonth)+'</span> dreams left this cycle';}
    else if(credits>0){el.innerHTML='<span>'+credits+'</span> dream credit'+(credits>1?'s':'')+' available';}
    else{el.innerHTML='Free plan -- <span style="cursor:pointer;text-decoration:underline;text-underline-offset:2px;" onclick="openPricingModal()">upgrade to submit</span>';}
  }

  function renderDreams(dreams){
    var c=document.getElementById('dreams-container');
    if(!dreams.length){c.innerHTML='<div class="empty-state"><div class="empty-state-orb">&#127769;</div><h3>No dreams yet</h3><p>Dream archive is empty. Submit your first dream.</p><button class="btn-submit" onclick="showPanel(\'submit\')">Submit your first dream</button></div>';return;}
    c.innerHTML='<div class="dream-list">'+dreams.map(function(r,i){return buildCard(r,i);}).join('')+'</div>';
  }

  function driveUrl(url){if(!url)return'';var m=url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);return m?'https://lh3.googleusercontent.com/d/'+m[1]:url;}
  function driveId(url){if(!url)return'';var m=url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);return m?m[1]:'';}
  function driveViewUrl(url){if(!url)return'';var m=url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);return m?'https://drive.google.com/file/d/'+m[1]+'/view':url;}

  function buildCard(rec,i){
    var f=rec.fields,id=rec.id;
    var date=f['Submitted At']?new Date(f['Submitted At']).toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'}):'Unknown date';
    var txt=f['Dream Text']||'Dream details unavailable';
    var mood=f['Mood']||'',interp=f['Interpretation']||'';
    var img1raw=f['Image 1 URL']||'',img2raw=f['Image 2 URL']||'';
    var img1=driveUrl(img1raw),img2=driveUrl(img2raw);
    var img1view=driveViewUrl(img1raw),img2view=driveViewUrl(img2raw);
    var audioRaw=f['Audio URL']||'',aid=driveId(audioRaw),audioView=driveViewUrl(audioRaw);
    var i1=img1?'<img src="'+img1+'" alt="Dream vision 1" onerror="this.parentElement.innerHTML=\'<div class=&quot;detail-img-placeholder&quot;>Image unavailable</div>\'">':'<div class="detail-img-placeholder">No image</div>';
    var i2=img2?'<img src="'+img2+'" alt="Dream vision 2" onerror="this.parentElement.innerHTML=\'<div class=&quot;detail-img-placeholder&quot;>Image unavailable</div>\'">':'<div class="detail-img-placeholder">No image</div>';
    var dl1=img1view?'<a class="img-dl-btn" href="'+img1view+'" target="_blank">Save</a>':'';
    var dl2=img2view?'<a class="img-dl-btn" href="'+img2view+'" target="_blank">Save</a>':'';
    var au=aid?'<div class="detail-section-label" style="margin-top:1rem;">Audio Narration</div><div class="audio-section"><div class="audio-player-wrap"><iframe src="https://drive.google.com/file/d/'+aid+'/preview" width="100%" height="80" allow="autoplay"></iframe></div><div class="audio-actions"><a class="audio-dl-btn" href="'+audioView+'" target="_blank">Download audio</a></div></div>':'';
    return '<div class="dream-item" id="dream-'+id+'" data-mood="'+mood+'" data-interp="'+interp.substring(0,200).replace(/"/g,'&quot;')+'"><div class="dream-item-header" onclick="toggleDream(\''+id+'\')"><div class="dream-item-left"><div class="dream-item-date">'+date+'</div><div class="dream-item-text">'+txt+'</div>'+(mood?'<div class="dream-item-mood">'+mood+'</div>':'')+'</div><div class="dream-item-right"><span class="dream-status complete">Complete</span><span class="dream-chevron">v</span></div></div><div class="dream-detail">'+(interp?'<div class="detail-section-label">Interpretation</div><div class="detail-interpretation">'+interp+'</div>':'')+(img1||img2?'<div class="detail-section-label">Dream Visions</div><div class="detail-images"><div class="detail-img-wrap">'+i1+dl1+'</div><div class="detail-img-wrap">'+i2+dl2+'</div></div>':'')+au+'</div></div>';
  }

  function toggleDream(id){
    var el=document.getElementById('dream-'+id);
    el.classList.toggle('expanded');
  }

  function showPanel(n){
    document.querySelectorAll('.panel').forEach(function(p){p.classList.remove('active');});
    document.querySelectorAll('.nav-item').forEach(function(x){x.classList.remove('active');});
    document.getElementById('panel-'+n).classList.add('active');
    document.querySelectorAll('.nav-item')[{home:0,submit:1,account:2}[n]].classList.add('active');
    var t={home:['My Dreams','Dream archive'],submit:['Submit a dream','Describe your dream'],account:['Your account','Plan &amp; profile']};
    document.getElementById('topbar-title').textContent=t[n][0];
    document.getElementById('topbar-sub').textContent=t[n][1]||'';
    // Reset submit form when navigating to submit panel
    if(n==='submit'){
      document.getElementById('submit-form').style.display='block';
      document.getElementById('processing-card').style.display='none';
      document.getElementById('dream-input').value='';
      document.getElementById('char-num').textContent='0';
      document.getElementById('mood-select').selectedIndex=0;
    }
  }

  function updateChar(){document.getElementById('char-num').textContent=document.getElementById('dream-input').value.length;}

  function showProcDone(title,msg){
    var btn='<button onclick="showPanel(\'home\');loadDreams();" style="font-family:DM Sans,sans-serif;font-size:.8rem;text-transform:uppercase;color:var(--ink);background:linear-gradient(135deg,var(--aurora1),var(--aurora2));border:none;padding:.7rem 1.6rem;border-radius:99px;cursor:pointer">View dream</button>';
    document.getElementById('processing-card').innerHTML='<div style="text-align:center;padding:2rem"><h3 style="font-family:Cormorant Garamond,serif;font-size:1.4rem;color:var(--fog);margin-bottom:.8rem">'+title+'</h3><p style="font-size:.84rem;color:var(--lavender);margin:0 auto 1.5rem">'+msg+'</p>'+btn+'</div>';
  }
  async function startProcessing(){
    var txt=document.getElementById('dream-input').value.trim();
    var mood=document.getElementById('mood-select').value;
    if(!txt){alert('Please describe your dream first.');return;}
    if(limit>0){if(limit-usedMonth<=0){alert('No dreams remaining this cycle.');return;}}
    else if(credits<=0){openPricingModal();return;}
    document.getElementById('submit-form').style.display='none';
    document.getElementById('processing-card').style.display='block';
    try{
      var res=await fetch('https://api.airtable.com/v0/'+BASE+'/'+TBL,{method:'POST',headers:{'Authorization':'Bearer '+AT,'Content-Type':'application/json'},body:JSON.stringify({records:[{fields:{'Dream Text':txt,'Mood':mood||'Not specified','User Email':email,'User ID':uid,'Status':'Pending','Submitted At':new Date().toLocaleDateString('en-CA')}}]})});
      if(!res.ok)throw new Error('Failed');
      var newRecord=await res.json();
      var newRecordId=newRecord.records&&newRecord.records[0]?newRecord.records[0].id:null;
      if(limit===0&&credits>0){await markCreditUsed();updateUI();}
      setTimeout(function(){document.getElementById('step2').className='proc-step active';},500);
      setTimeout(function(){document.getElementById('step2').className='proc-step done';document.getElementById('step2').querySelector('.proc-icon').textContent='v';document.getElementById('step3').className='proc-step active';},8000);
      setTimeout(function(){document.getElementById('step3').className='proc-step done';document.getElementById('step3').querySelector('.proc-icon').textContent='v';document.getElementById('step4').className='proc-step active';},20000);
      // Poll every 30 seconds to detect when dream is Complete
      var pollCount=0,maxPolls=20;
      var pollInterval=setInterval(async function(){
        pollCount++;
        if(pollCount>maxPolls){
          clearInterval(pollInterval);
          usedMonth++;updateUI();
          showProcDone('Almost ready','Check your email for results.');
          return;
        }
        try{
          if(!newRecordId)return;
          var checkRes=await fetch('https://api.airtable.com/v0/'+BASE+'/'+TBL+'/'+newRecordId,{headers:{'Authorization':'Bearer '+AT}});
          var checkData=await checkRes.json();
          if(checkData.fields&&checkData.fields['Status']==='Complete'){
            clearInterval(pollInterval);
            document.getElementById('step2').className='proc-step done';document.getElementById('step2').querySelector('.proc-icon').textContent='v';
            document.getElementById('step3').className='proc-step done';document.getElementById('step3').querySelector('.proc-icon').textContent='v';
            document.getElementById('step4').className='proc-step done';document.getElementById('step4').querySelector('.proc-icon').textContent='v';
            usedMonth++;updateUI();
            showProcDone('Your dream is ready','Your results are ready.');
            setTimeout(function(){showPanel('home');loadDreams();},3000);
          }
        }catch(e){}
      },30000);
    }catch(err){
      document.getElementById('submit-form').style.display='block';
      document.getElementById('processing-card').style.display='none';
      alert('Something went wrong. Try again.');
    }
  }

  // ── HOROSCOPE ──
  var SIGNS={aries:['&#9800;','Aries','Mar 21-Apr 19'],taurus:['&#9801;','Taurus','Apr 20-May 20'],gemini:['&#9802;','Gemini','May 21-Jun 20'],cancer:['&#9803;','Cancer','Jun 21-Jul 22'],leo:['&#9804;','Leo','Jul 23-Aug 22'],virgo:['&#9805;','Virgo','Aug 23-Sep 22'],libra:['&#9806;','Libra','Sep 23-Oct 22'],scorpio:['&#9807;','Scorpio','Oct 23-Nov 21'],sagittarius:['&#9808;','Sagittarius','Nov 22-Dec 21'],capricorn:['&#9809;','Capricorn','Dec 22-Jan 19'],aquarius:['&#9810;','Aquarius','Jan 20-Feb 18'],pisces:['&#9811;','Pisces','Feb 19-Mar 20']};
  function loadHoroscope(){
    var sign=document.getElementById('horoscope-sign').value;
    var body=document.getElementById('horoscope-body');
    body.innerHTML='<div class="loading-pulse"><div class="loading-dot"></div><div class="loading-dot"></div><div class="loading-dot"></div><span>Loading...</span></div>';
    var now=new Date();
    document.getElementById('horoscope-date').textContent=now.toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'});
    var sd=SIGNS[sign];
    if(sd){
      document.getElementById('horoscope-glyph').innerHTML=sd[0];
      document.getElementById('horoscope-sign-name').innerHTML=sd[1]+'<br><small style="font-size:.7rem;color:var(--iris)">'+sd[2]+'</small>';
    }
    try{localStorage.setItem('llai_sign',sign);}catch(e){}
    // Fetch both daily and weekly
    fetch('https://corsproxy.io/?url=https://horoscope-app-api.vercel.app/api/v1/get-horoscope/daily?sign='+sign+'%26day=today').then(function(r){return r.json();}).then(function(d){if(d&&d.data&&d.data.horoscope_data){body.innerHTML='<p style="font-family:Cormorant Garamond,serif;font-style:italic;color:rgba(240,237,248,.85);line-height:1.9">'+d.data.horoscope_data+'</p>';}else{hFallback(sign,body);}}).catch(function(){hFallback(sign,body);});
  }

  function hFallback(sign,body){var horoscopes={aries:"Trust your instincts. The stars favor bold moves.",taurus:"Patience brings rewards. What you seek is closer than it appears.",gemini:"Your mind is sharp. Stay open to unexpected conversations.",cancer:"A quiet moment of reflection may reveal what you truly need.",leo:"Lead with generosity. What you give returns in unexpected ways.",virgo:"A careful approach to a lingering problem brings resolution.",libra:"Balance is calling. Today offers a chance to restore harmony.",scorpio:"Trust your intuition. It points toward a truth worth facing.",sagittarius:"An idea could open a door you did not know existed.",capricorn:"Steady focus moves you further than rushing ever could.",aquarius:"Do not hold back an unconventional idea. Originality is needed.",pisces:"Subtle feelings carry messages today. The invisible world speaks."};
var text=horoscopes[sign]||horoscopes.aries;body.innerHTML='<p style="font-family:Cormorant Garamond,serif;font-style:italic;color:rgba(240,237,248,.85);line-height:1.9">'+text+'</p>';}

  // Initialize horoscope on load
  function initHoroscope(){try{var s=localStorage.getItem('llai_sign');if(s)document.getElementById('horoscope-sign').value=s;}catch(e){}loadHoroscope();}
