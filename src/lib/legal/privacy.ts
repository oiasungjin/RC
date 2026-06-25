import type { LegalContent } from './types';
import { COMPANY } from './types';

// 개인정보처리방침 — 대한민국 개인정보보호법(PIPA) 기준 실무 초안.
// ⚠️ 게시 전 법률 검수 및 〔…〕 빈칸 확정 필요. 실제 데이터 흐름(app 코드)에 맞춰 작성됨.

export const PRIVACY: LegalContent = {
  ko: {
    title: '개인정보처리방침',
    updated: `시행일 ${COMPANY.effective}`,
    intro: `${COMPANY.nameKo}(이하 "회사")는 ${COMPANY.service}(이하 "서비스") 이용자의 개인정보를 중요하게 생각하며, 「개인정보 보호법」 등 관련 법령을 준수합니다. 본 방침은 회사가 어떤 정보를 어떤 목적으로 처리하고 어떻게 보호하는지를 설명합니다.`,
    sections: [
      {
        heading: '1. 수집하는 개인정보 항목',
        body: [
          '회사는 서비스 제공에 필요한 최소한의 정보만 수집합니다.',
          '· 필수(회원가입 시): 이메일 주소, 비밀번호(암호화하여 저장)',
          '· 선택(프로필): 성별, 출생연도, 학력, 직업 — 또래 비교·통계 목적이며 입력하지 않아도 이용 가능',
          '· 서비스 이용 중 생성되는 정보: 사용자가 기록한 단어, 단어 분류, 감정 태그, 맥락 메모, 알고있음/모르는편 상태, 회상 단서에 대한 응답, 회상 훈련 기록(정답·시도 횟수 등), 접속 및 이용 일시',
          '· 자동 생성/저장: 로그인하지 않은 경우 위 기록은 회사 서버로 전송되지 않고 이용자의 기기(브라우저 로컬 저장소)에만 저장됩니다.',
        ],
      },
      {
        heading: '2. 기록 정보의 성격',
        body: [
          '서비스에 기록되는 단어·회상·언어 활동 정보는 건강정보나 의료정보가 아니며, 「개인정보 보호법」상 민감정보에 해당하지 않습니다. 회사는 이를 일반 개인정보로서 신중히 취급합니다.',
          '회사는 이 정보를 질병의 진단·예측·선별·치료 목적으로 사용하지 않으며, 서비스는 의료기기가 아닙니다. 이용자는 건강 상태 등 민감한 내용을 메모에 입력하지 않도록 권장됩니다.',
        ],
      },
      {
        heading: '3. 개인정보의 처리 목적',
        body: [
          '· 회원 식별·인증 및 계정 관리',
          '· 단어 기록·회상 훈련·개인화(가중치) 등 핵심 기능 제공',
          '· 선택 입력 정보에 기반한 통계·또래 비교 등 참고용 분석 제공',
          '· 서비스 개선, 오류 대응, 부정이용 방지',
          '· 법령상 의무 이행',
        ],
      },
      {
        heading: '4. 개인정보의 보유 및 이용 기간',
        body: [
          '회사는 원칙적으로 회원 탈퇴 시 또는 처리 목적 달성 시 개인정보를 지체 없이 파기합니다.',
          '다만 관련 법령에서 보존을 요구하는 경우, 또는 분쟁 대응·부정이용 방지 등 회사의 정당한 이익을 위하여 필요한 경우에는 그 목적에 필요한 범위에서 보관할 수 있습니다.',
          '개인을 식별할 수 없도록 비식별·통계 처리된 정보는 파기 대상에서 제외되며, 회사는 이를 기간 제한 없이 보존·활용할 수 있습니다.',
          '로그인하지 않고 기기에만 저장된 기록은 회사가 보유하지 않으며, 이용자가 브라우저 데이터를 삭제하여 직접 제거할 수 있습니다.',
        ],
      },
      {
        heading: '5. 개인정보의 처리 위탁',
        body: [
          '회사는 안정적인 서비스 제공을 위해 아래와 같이 처리를 위탁하고 있으며, 수탁자가 개인정보를 안전하게 처리하도록 관리·감독합니다.',
          `· Supabase, Inc. — 데이터베이스 및 인증 인프라 호스팅 (저장 리전: 〔실제 리전 확인 필요 — 예: 서울〕)`,
          '· Anthropic, PBC — 사전에 없는 단어의 유사어 생성(AI). 현재 이 기능은 비활성화되어 있으며, 활성화 시 제6항에 따른 국외이전 동의를 받습니다.',
        ],
      },
      {
        heading: '6. 개인정보의 국외 이전',
        body: [
          '현재 회사는 외부 AI를 통한 단어 처리를 비활성화하고 있어, 이용자가 입력한 단어의 국외 이전은 발생하지 않습니다.',
          '향후 AI 유사어 생성 기능을 활성화할 경우, 이전 직전에 아래 사항을 고지하고 이용자의 동의를 받으며, 동의하지 않으면 해당 단어는 외부로 전송되지 않습니다.',
          '· 이전받는 자: Anthropic, PBC',
          '· 이전 국가: 미국',
          '· 이전 항목: 이용자가 입력한 단어(텍스트)',
          '· 이전 목적: 같은 분류의 유사어 생성',
          '· 이전 일시·방법: 기능 이용 시점에 네트워크를 통해 전송',
        ],
      },
      {
        heading: '7. 정보주체의 권리와 행사 방법',
        body: [
          '이용자는 언제든지 다음 권리를 행사할 수 있습니다: 개인정보 열람, 정정, 삭제, 처리정지, 동의 철회, 회원 탈퇴.',
          `권리 행사는 ${COMPANY.email} 로 요청하실 수 있으며, 회사는 지체 없이 조치합니다. 앱 내 설정·계정 메뉴를 통해 직접 수정·삭제할 수 있는 항목도 있습니다.`,
        ],
      },
      {
        heading: '8. 만 14세 미만 아동',
        body: [
          '서비스는 만 14세 이상을 대상으로 합니다. 회사는 만 14세 미만 아동의 개인정보를 고의로 수집하지 않으며, 수집된 사실이 확인되면 지체 없이 파기합니다.',
        ],
      },
      {
        heading: '9. 개인정보의 안전성 확보 조치',
        body: [
          '회사는 비밀번호 암호화, 접근권한 통제(행 수준 보안), 전송 구간 암호화(HTTPS) 등 합리적인 보호 조치를 적용합니다.',
        ],
      },
      {
        heading: '10. 쿠키 등 자동 수집 장치',
        body: [
          '회사는 로그인 상태 유지를 위해 인증 세션 쿠키를 사용합니다. 이용자는 브라우저 설정에서 쿠키 저장을 거부할 수 있으나, 이 경우 로그인이 제한될 수 있습니다.',
        ],
      },
      {
        heading: '11. 개인정보 보호책임자 및 문의',
        body: [
          `· 개인정보 보호책임자: ${COMPANY.officer}`,
          `· 문의: ${COMPANY.email}`,
          '개인정보 침해로 인한 상담·신고는 개인정보분쟁조정위원회(1833-6972), 개인정보침해신고센터(국번 없이 118) 등에 문의할 수 있습니다.',
        ],
      },
      {
        heading: '12. 처리방침의 변경',
        body: [
          '본 방침은 법령·서비스 변경에 따라 개정될 수 있으며, 개정 시 시행일과 변경 내용을 서비스 내 공지합니다.',
        ],
      },
      {
        heading: '13. 개인정보 유출 등의 통지',
        body: [
          '회사는 개인정보의 분실·도난·유출(이하 "유출등")을 인지한 경우, 관련 법령에 따라 지체 없이 정보주체에게 ① 유출된 항목 ② 발생 시점과 경위 ③ 피해를 최소화하기 위해 정보주체가 할 수 있는 조치 ④ 회사의 대응 조치와 피해 구제 절차 ⑤ 문의처를 통지합니다.',
          '법령에서 정한 기준(일정 규모 이상 등)에 해당하는 경우, 회사는 개인정보보호위원회 또는 한국인터넷진흥원(KISA)에 신고하고 유출 확산 방지·복구 등 필요한 조치를 취합니다.',
        ],
      },
    ],
  },

  en: {
    title: 'Privacy Policy',
    updated: `Effective ${COMPANY.effective}`,
    intro: `${COMPANY.nameEn} ("Company") values the privacy of users of ${COMPANY.service} ("Service") and complies with Korea's Personal Information Protection Act (PIPA) and other applicable laws. This policy explains what we process, why, and how we protect it. The Korean version prevails in case of any discrepancy.`,
    sections: [
      {
        heading: '1. Information We Collect',
        body: [
          'We collect only the minimum necessary to provide the Service.',
          '· Required (sign-up): email address, password (stored encrypted)',
          '· Optional (profile): gender, birth year, education, occupation — used for peer comparison and statistics; you can use the Service without providing them',
          '· Generated during use: words you record, word categories, emotion tags, context notes, known/unknown status, responses to recall cues, training records (answers, attempts), and access timestamps',
          '· Local storage: if you are not signed in, the above records are not sent to our servers and are stored only on your device (browser local storage)',
        ],
      },
      {
        heading: '2. Nature of Recorded Information',
        body: [
          'Information recorded in the Service about words, recall, and language activity is not health or medical information and is not "sensitive information" under Korea’s Personal Information Protection Act. We handle it carefully as ordinary personal information.',
          'We do not use this information to diagnose, predict, screen for, or treat any disease, and the Service is not a medical device. You are advised not to enter sensitive content such as health conditions in notes.',
        ],
      },
      {
        heading: '3. Purposes of Processing',
        body: [
          '· Member identification, authentication, and account management',
          '· Providing core features: word recording, recall training, and personalization',
          '· Reference statistics and peer comparison based on optional inputs',
          '· Service improvement, error handling, and abuse prevention',
          '· Compliance with legal obligations',
        ],
      },
      {
        heading: '4. Retention Period',
        body: [
          'We delete personal information without delay upon account withdrawal or once the processing purpose is fulfilled.',
          'However, where law requires retention, or where necessary for the Company’s legitimate interests such as handling disputes or preventing abuse, we may retain it to the extent necessary for that purpose.',
          'De-identified or aggregated information from which individuals cannot be identified is excluded from deletion, and the Company may retain and use it without time limit.',
          'Records stored only on your device are not held by us and can be removed by clearing your browser data.',
        ],
      },
      {
        heading: '5. Processing Entrustment (Sub-processors)',
        body: [
          'We entrust processing to the following providers and supervise their secure handling of data.',
          '· Supabase, Inc. — database and authentication infrastructure (storage region: [confirm actual region])',
          '· Anthropic, PBC — AI generation of related words for words not in our dictionary. This feature is currently disabled; if enabled, overseas-transfer consent under Section 6 applies.',
        ],
      },
      {
        heading: '6. Overseas Transfer',
        body: [
          'External AI word processing is currently disabled, so no overseas transfer of the words you enter occurs.',
          'If we later enable AI related-word generation, we will disclose the following and obtain your consent before transfer; if you decline, the word will not be sent abroad.',
          '· Recipient: Anthropic, PBC',
          '· Country: United States',
          '· Items: the word (text) you enter',
          '· Purpose: generating same-category related words',
          '· When/how: transmitted over the network at the time of use',
        ],
      },
      {
        heading: '7. Your Rights',
        body: [
          'You may at any time access, correct, delete, suspend processing of, or withdraw consent for your personal information, and withdraw membership.',
          `Send requests to ${COMPANY.email}; we will act without delay. Some items can be edited or deleted directly in the app.`,
        ],
      },
      {
        heading: '8. Children Under 14',
        body: [
          'The Service is intended for users aged 14 and over. We do not knowingly collect personal information from children under 14 and will delete it promptly if discovered.',
        ],
      },
      {
        heading: '9. Security Measures',
        body: ['We apply reasonable safeguards including password encryption, access control (row-level security), and encryption in transit (HTTPS).'],
      },
      {
        heading: '10. Cookies',
        body: ['We use authentication session cookies to keep you signed in. You may refuse cookies in your browser settings, but sign-in may then be limited.'],
      },
      {
        heading: '11. Privacy Officer & Contact',
        body: [`· Privacy Officer: ${COMPANY.officer}`, `· Contact: ${COMPANY.email}`],
      },
      {
        heading: '12. Changes to This Policy',
        body: ['We may revise this policy as laws or the Service change, and will announce the effective date and changes within the Service.'],
      },
      {
        heading: '13. Data Breach Notification',
        body: [
          'If we become aware of a loss, theft, or unauthorized disclosure of personal data, we will notify affected users without undue delay, describing what happened, the data involved, steps you can take to reduce harm, the measures we have taken, and how to contact us.',
          'Where required by law, we will report to the competent authority — in Korea, the Personal Information Protection Commission (PIPC) / KISA. For users in the EU or UK, we aim to notify the relevant supervisory authority within 72 hours of becoming aware of a notifiable breach, as required by the GDPR / UK GDPR.',
        ],
      },
      {
        heading: '14. EU / UK Users (GDPR)',
        body: [
          'If you are in the European Economic Area or the United Kingdom, we process your personal data on these legal bases: performance of our contract with you (providing the Service), your consent (e.g., optional profile data and any overseas AI transfer), and our legitimate interests (security, abuse prevention, and service improvement).',
          'You have the right to access, rectify, erase, restrict, and port your data, to object to processing, and to lodge a complaint with your local supervisory authority. Where we transfer data internationally, we rely on appropriate safeguards such as Standard Contractual Clauses where applicable.',
          `For data protection requests, contact ${COMPANY.email}.`,
        ],
      },
      {
        heading: '15. California Residents (CCPA / CPRA)',
        body: [
          'If you are a California resident, you have the right to know, access, correct, and delete the personal information we collect, and the right not to be discriminated against for exercising these rights.',
          `We do not sell your personal information, nor share it for cross-context behavioral advertising. To exercise your rights, contact ${COMPANY.email}.`,
        ],
      },
    ],
  },

  ja: {
    title: 'プライバシーポリシー',
    updated: `施行日 ${COMPANY.effective}`,
    intro: `${COMPANY.nameKo}（${COMPANY.nameEn}、以下「当社」）は、${COMPANY.service}（以下「本サービス」）利用者の個人情報を重要視し、韓国「個人情報保護法（PIPA）」等の関連法令を遵守します。本ポリシーは、当社がどの情報をどの目的で処理し、どのように保護するかを説明します。相違がある場合は韓国語版が優先します。`,
    sections: [
      {
        heading: '1. 収集する個人情報',
        body: [
          '当社はサービス提供に必要な最小限の情報のみを収集します。',
          '· 必須（会員登録時）：メールアドレス、パスワード（暗号化して保存）',
          '· 任意（プロフィール）：性別、生年、学歴、職業 — 同年代比較・統計のためで、未入力でも利用可能',
          '· 利用中に生成される情報：記録した単語、単語分類、感情タグ、文脈メモ、「知っている／思い出しにくい」状態、想起手がかりへの応答、想起トレーニング記録（正答・試行回数等）、接続・利用日時',
          '· ローカル保存：ログインしない場合、上記記録は当社サーバーに送信されず、利用者の端末（ブラウザのローカルストレージ）にのみ保存されます。',
        ],
      },
      {
        heading: '2. 記録情報の性格',
        body: [
          '本サービスに記録される単語・想起・言語活動の情報は健康情報・医療情報ではなく、韓国「個人情報保護法」上の機微情報には該当しません。当社はこれを一般個人情報として慎重に取り扱います。',
          '当社はこの情報を疾病の診断・予測・選別・治療の目的では使用せず、本サービスは医療機器ではありません。利用者は健康状態等の機微な内容をメモに入力しないことが推奨されます。',
        ],
      },
      {
        heading: '3. 処理目的',
        body: [
          '· 会員の識別・認証およびアカウント管理',
          '· 単語記録・想起トレーニング・個人化などの中核機能の提供',
          '· 任意入力情報に基づく統計・同年代比較などの参考分析',
          '· サービス改善、エラー対応、不正利用防止',
          '· 法令上の義務の履行',
        ],
      },
      {
        heading: '4. 保有・利用期間',
        body: [
          '当社は原則として退会時または処理目的の達成時に、個人情報を遅滞なく破棄します。',
          'ただし法令が保存を求める場合、または紛争対応・不正利用防止等、当社の正当な利益のために必要な場合には、その目的に必要な範囲で保管することがあります。',
          '個人を識別できないよう非識別化・統計処理された情報は破棄の対象から除外され、当社は期間の制限なくこれを保存・活用できます。',
          '端末にのみ保存された記録は当社が保有せず、利用者がブラウザデータを削除して直接消去できます。',
        ],
      },
      {
        heading: '5. 処理の委託',
        body: [
          '当社は安定的なサービス提供のため以下に処理を委託し、受託者の安全な取扱いを管理・監督します。',
          '· Supabase, Inc. — データベースおよび認証インフラのホスティング（保存リージョン：[実際のリージョン要確認]）',
          '· Anthropic, PBC — 辞書にない単語の類義語生成（AI）。現在この機能は無効で、有効化時は第6項の国外移転同意が適用されます。',
        ],
      },
      {
        heading: '6. 国外移転',
        body: [
          '現在、外部AIによる単語処理は無効のため、入力した単語の国外移転は発生しません。',
          '将来AI類義語生成を有効化する場合、移転直前に以下を告知し同意を得ます。同意しない場合、当該単語は外部へ送信されません。',
          '· 移転を受ける者：Anthropic, PBC',
          '· 移転国：米国',
          '· 移転項目：利用者が入力した単語（テキスト）',
          '· 移転目的：同分類の類義語生成',
          '· 日時・方法：利用時点でネットワークを通じて送信',
        ],
      },
      {
        heading: '7. 利用者の権利',
        body: [
          '利用者はいつでも、個人情報の閲覧・訂正・削除・処理停止・同意撤回・退会を行えます。',
          `権利行使は ${COMPANY.email} へご請求ください。当社は遅滞なく対応します。アプリ内で直接修正・削除できる項目もあります。`,
        ],
      },
      {
        heading: '8. 14歳未満の児童',
        body: ['本サービスは14歳以上を対象とします。当社は14歳未満の児童の個人情報を故意に収集せず、判明した場合は遅滞なく破棄します。'],
      },
      {
        heading: '9. 安全性確保措置',
        body: ['当社はパスワードの暗号化、アクセス権限の制御（行レベルセキュリティ）、通信区間の暗号化（HTTPS）等の合理的な保護措置を適用します。'],
      },
      {
        heading: '10. クッキー',
        body: ['当社はログイン状態維持のため認証セッションクッキーを使用します。ブラウザ設定で拒否できますが、その場合ログインが制限されることがあります。'],
      },
      {
        heading: '11. 個人情報保護責任者・お問い合わせ',
        body: [`· 個人情報保護責任者：${COMPANY.officer}`, `· お問い合わせ：${COMPANY.email}`],
      },
      {
        heading: '12. ポリシーの変更',
        body: ['本ポリシーは法令・サービスの変更により改定されることがあり、改定時は施行日と変更内容をサービス内で告知します。'],
      },
      {
        heading: '13. 漏えい等の通知',
        body: [
          '当社は、個人データの紛失・盗難・漏えい（以下「漏えい等」）を認識した場合、関連法令に従い、影響を受ける利用者に対し、①漏えいした項目 ②発生時点と経緯 ③被害を最小化するために利用者が取り得る措置 ④当社の対応と被害救済の手続 ⑤問い合わせ先を、遅滞なく通知します。',
          '法令上の基準に該当する場合、当社は韓国・個人情報保護委員会（PIPC）／韓国インターネット振興院（KISA）に申告します。日本にお住まいの方については、日本の個人情報保護委員会（PPC）への報告および本人への通知を含め、個人情報保護法（APPI）に従って対応します。',
        ],
      },
      {
        heading: '14. 日本にお住まいの方（APPIに基づく取扱い）',
        body: [
          '当社は、利用目的を本ポリシーのとおり公表し、その範囲内で個人情報を取り扱います。あらかじめ同意を得た場合または法令に基づく場合を除き、個人データを第三者に提供しません。',
          '外国にある第三者へ個人データを提供する場合（第6項参照）は、APPIに基づき必要な情報を提供したうえで同意を得ます。',
          `利用者は、保有個人データの開示・訂正・利用停止・第三者提供の停止等を請求できます。請求およびお問い合わせ先：${COMPANY.email}。なお、苦情は個人情報保護委員会にも相談できます。`,
        ],
      },
    ],
  },
};
