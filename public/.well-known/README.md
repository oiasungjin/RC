# Digital Asset Links (TWA)

`assetlinks.json`은 안드로이드 TWA가 이 도메인의 소유를 검증해 **주소창(URL bar)을 제거**하는 데 쓰입니다.
배포 후 `https://<도메인>/.well-known/assetlinks.json` 으로 접근 가능해야 합니다.

## 배포 후 채워야 할 값 2가지
1. **package_name** — 실제 Android 패키지명으로 교체 (현재 임시: `app.mnemo.twa`)
2. **sha256_cert_fingerprints** — 앱 서명 인증서의 SHA-256 지문
   - Play 앱 서명 사용 시: Play Console → 앱 → 설정 → 앱 무결성(App integrity) → SHA-256 복사
   - 직접 keystore 사용 시: `keytool -list -v -keystore my.keystore` 출력의 SHA256

값을 교체한 뒤 재배포하면 TWA에서 주소창이 사라집니다.

## 포장 절차 요약
1. 웹앱 배포(HTTPS 도메인 확보)
2. `npx @bubblewrap/cli init --manifest https://<도메인>/manifest.webmanifest`
3. `bubblewrap build` → AAB 생성 (이때 패키지명/서명키 결정)
4. 위 2개 값을 이 파일에 반영 → 재배포
5. AAB를 Play Console 업로드 → 심사
