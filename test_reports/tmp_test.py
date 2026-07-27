import requests, io, time
BASE = "https://proposal-tracker-app.preview.emergentagent.com/api"

def new_session(email, pw):
    s = requests.Session()
    s.post(f"{BASE}/auth/login", json={"email":email,"password":pw})
    return s

sales = new_session("sales@botree.com","Sales@123")
cgo = new_session("cgo@botree.com","CGO@123")

def upload(s):
    r = s.post(f"{BASE}/proposals/upload", files={"file":("t.pdf", io.BytesIO(b"%PDF-1.4 xy"), "application/pdf")})
    print(" upload:", r.status_code, r.text[:120])
    return r.json().get("file_id") or r.json().get("id")

fid1 = upload(sales)
prop = {"title":"Restore v1","description":"Original","customer_name":"Cust A",
        "industry":"IT","product":"GTMPro","deal_value":100000,"users":"10","rate":"1000",
        "file_id":fid1,"one_time":"5000","comments":"initial"}
r = sales.post(f"{BASE}/proposals", json=prop); print("CREATE:", r.status_code)
pid = r.json()["id"]; print("PID:", pid)

r = cgo.post(f"{BASE}/proposals/{pid}/return-for-revision", json={"comment":"revise"}); print("RETURN:", r.status_code)

sales = new_session("sales@botree.com","Sales@123")
fid2 = upload(sales)
prop2 = {"title":"Restore v2 EDITED","description":"Modified","customer_name":"Cust B",
         "industry":"Finance","product":"GTMPro","deal_value":200000,"users":"20","rate":"1000",
         "file_id":fid2,"one_time":"8000","comments":"edited"}
r = sales.put(f"{BASE}/proposals/{pid}", json=prop2); print("EDIT v2:", r.status_code, r.text[:150])

cgo = new_session("cgo@botree.com","CGO@123")
r = cgo.post(f"{BASE}/proposals/{pid}/return-for-revision", json={"comment":"revise2"}); print("RETURN2:", r.status_code)

sales = new_session("sales@botree.com","Sales@123")
r = sales.post(f"{BASE}/proposals/{pid}/restore-version?version_number=1")
print("RESTORE v1:", r.status_code, r.text[:250])

r2 = cgo.post(f"{BASE}/proposals/{pid}/restore-version?version_number=1")
print("RESTORE_AS_CGO (expect 403):", r2.status_code)

r4 = sales.post(f"{BASE}/proposals/{pid}/restore-version?version_number=1")
print("RESTORE_NOT_REVISION (expect 400):", r4.status_code, r4.text[:120])

# Return again and try bad version
cgo = new_session("cgo@botree.com","CGO@123")
r = cgo.post(f"{BASE}/proposals/{pid}/return-for-revision", json={"comment":"r3"}); print("RETURN3:", r.status_code)
sales = new_session("sales@botree.com","Sales@123")
r3 = sales.post(f"{BASE}/proposals/{pid}/restore-version?version_number=99")
print("RESTORE_BAD_VER:", r3.status_code, r3.text[:150])

r = sales.get(f"{BASE}/proposals/{pid}/versions")
vs = r.json().get("versions", [])
print("\nVERSIONS:")
for v in vs:
    print(f"  v{v.get('version_number')} label={v.get('version_label')} title='{v.get('title')}' cust='{v.get('customer_name')}' deal={v.get('deal_value')} note='{v.get('change_note')}'")

r = sales.get(f"{BASE}/proposals/{pid}"); p = r.json()
print(f"\nCURRENT: status={p.get('status')} v={p.get('current_version')} title={p.get('title')} cust={p.get('customer_name')} deal={p.get('deal_value')}")
print("Last 4 history:")
for h in p.get("history", [])[-4:]:
    print(f"  {h.get('action')} v={h.get('version')} by={h.get('by',{}).get('role')} comment={h.get('comment')}")

v1 = next((v for v in vs if v['version_number']==1), None)
v3 = next((v for v in vs if v['version_number']==3), None)
if v1 and v3:
    fields = ['title','description','customer_name','industry','product','deal_value']
    for f in fields:
        print(f"  {f}: v1={v1.get(f)!r} == v3={v3.get(f)!r} -> {v1.get(f)==v3.get(f)}")
    print("V3 change_note:", v3.get('change_note'))
