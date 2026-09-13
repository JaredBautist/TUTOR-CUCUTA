/** Test-only Auth/database server in an isolated browser; no production bypass or hosted writes. */
export function installAccountFixture({ signedIn = true } = {}) {
  const key = 'sb-catalog-auth-token';
  const defaults = role => role === 'student' ? { name:'',age:null,grade:'',school:'',sector:'',address:'',phone:'',guardianName:'',guardianPhone:'',guardianRelation:'',guardianAuthorized:false,academicGoal:'',difficultiesOrTopics:'',learningStyles:[],preferredModality:'presencial',preferredSchedule:'',bioNote:'' } : { name:'',title:'',institution:'',experienceYears:null,ratePerHour:null,coverageRadiusKm:5,bio:'',subjects:[],specialties:[] };
  const user = role => ({ id: role === 'student' ? '10000000-0000-4000-8000-000000000001' : '10000000-0000-4000-8000-000000000002', aud:'authenticated',role:'authenticated',email:`${role}@example.invalid`,app_metadata:{provider:'email'},user_metadata:{account_role:role},created_at:new Date().toISOString() });
  const session = role => {
    const currentUser = user(role); const now = Math.floor(Date.now()/1000);
    const payload = btoa(JSON.stringify({ sub:currentUser.id,role:'authenticated',aud:'authenticated',iat:now,exp:now+3600 }));
    return { access_token:`eyJhbGciOiJIUzI1NiJ9.${payload}.test-signature`,refresh_token:`test-refresh-${role}`,expires_in:3600,expires_at:now+3600,token_type:'bearer',user:currentUser };
  };
  if (!localStorage.getItem('auth-fixture-initialized')) {
    localStorage.setItem('auth-fixture-initialized','true');
    if(signedIn) localStorage.setItem(key,JSON.stringify(session('student')));
  }
  window.__authFixture = { session, calls:[], failSave:false, conflict:false, failRead:false, signupRole:null };
  const response = (body,status=200) => new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json','x-supabase-api-version':'2024-01-01'}});
  const nativeFetch = window.fetch.bind(window);
  window.fetch = async (input,init={}) => {
    const url = new URL(typeof input === 'string' ? input : input.url || String(input));
    if(url.origin !== 'https://catalog.invalid') return nativeFetch(input,init);
    const method = init.method || 'GET'; const request = typeof init.body==='string' ? JSON.parse(init.body) : {};
    const harness = window.__authFixture;
    if(url.pathname.startsWith('/auth/v1/')) {
      harness.calls.push({path:url.pathname,method});
      if(url.pathname.endsWith('/token')) {
        if(request.password === 'wrong-password') return response({code:'invalid_credentials',msg:'Invalid credentials'},400);
        const role = request.email?.startsWith('tutor') || request.refresh_token?.endsWith('tutor') ? 'tutor':'student';
        return response(session(role));
      }
      if(url.pathname.endsWith('/signup')) { harness.signupRole=request.data?.account_role; return response({user:user(harness.signupRole),session:null}); }
      if(url.pathname.endsWith('/recover') || url.pathname.endsWith('/logout')) return response({});
      if(url.pathname.endsWith('/user')) return response(JSON.parse(localStorage.getItem(key) || '{}').user || user('student'));
    }
    if(url.pathname === '/rest/v1/rpc/list_tutoring_requests_v1') return response([]);
    if(url.pathname === '/rest/v1/rpc/own_tutor_offer_v1') return response(null);
    if(url.pathname === '/rest/v1/tutor_documents') return response([]);
    if(url.pathname === '/rest/v1/user_accounts') {
      harness.calls.push({path:url.pathname,method});
      if(harness.failRead && method==='GET') return response({code:'PGRST205',message:'Missing table'},404);
      const id = url.searchParams.get('id')?.replace('eq.','') || request.id;
      const current = JSON.parse(localStorage.getItem(key) || '{}').user;
      if(!current || current.id !== id) return response(null);
      const rowKey = `test-account-${id}`;
      let row = JSON.parse(localStorage.getItem(rowKey) || 'null');
      if(method==='POST') { row={...request,avatar_path:null,avatar_url:null,version:1}; localStorage.setItem(rowKey,JSON.stringify(row)); }
      if(method==='PATCH') {
        if(harness.failSave) return response({message:'Controlled offline save'},503);
        if(harness.conflict || Number(url.searchParams.get('version')?.replace('eq.','')) !== row.version) return response(null);
        row={...row,...request,version:row.version+1}; localStorage.setItem(rowKey,JSON.stringify(row));
      }
      return response(row);
    }
    return nativeFetch(input,init);
  };
}
