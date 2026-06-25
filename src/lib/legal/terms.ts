import type { LegalContent } from './types';
import { COMPANY } from './types';

// 이용약관 — 대한민국 법령 기준 실무 초안. ⚠️ 게시 전 법률 검수 및 〔…〕 빈칸 확정 필요.

export const TERMS: LegalContent = {
  ko: {
    title: '이용약관',
    updated: `시행일 ${COMPANY.effective}`,
    intro: `본 약관은 ${COMPANY.nameKo}(이하 "회사")가 제공하는 ${COMPANY.service}(이하 "서비스")의 이용에 관한 회사와 이용자 간 권리·의무를 규정합니다.`,
    sections: [
      {
        heading: '제1조 (목적)',
        body: ['본 약관은 서비스의 이용조건 및 절차, 회사와 이용자의 권리·의무·책임사항을 규정함을 목적으로 합니다.'],
      },
      {
        heading: '제2조 (정의)',
        body: [
          '· "서비스": 떠올리기 어려운 단어를 기록하고 같은 분류의 단어로 되짚어 보는 웰니스·생활기록 도구',
          '· "이용자": 본 약관에 동의하고 서비스를 이용하는 회원 및 비회원',
          '· "회원": 계정을 등록하여 지속적으로 서비스를 이용하는 자',
          '· "콘텐츠": 이용자가 서비스에 입력·기록한 단어, 메모, 태그 등 일체의 정보',
        ],
      },
      {
        heading: '제3조 (약관의 효력 및 변경)',
        body: [
          '본 약관은 서비스 화면에 게시함으로써 효력이 발생합니다.',
          '회사는 관련 법령을 위반하지 않는 범위에서 약관을 변경할 수 있으며, 변경 시 시행일과 내용을 사전 공지합니다. 변경 후에도 서비스를 계속 이용하면 변경에 동의한 것으로 봅니다.',
        ],
      },
      {
        heading: '제4조 (서비스의 내용 및 성격)',
        body: [
          '서비스는 어휘 회상 기록과 연습을 돕는 웰니스·생활기록(라이프로그) 도구입니다.',
          '서비스는 질병의 진단·예측·선별·치료를 목적으로 하지 않으며, 의료기기가 아닙니다. 건강에 관한 판단은 반드시 전문가와 상담하시기 바랍니다.',
        ],
      },
      {
        heading: '제5조 (회원가입 및 계정)',
        body: [
          '이용자는 회사가 정한 절차에 따라 이메일과 비밀번호로 회원가입을 신청할 수 있습니다. 서비스는 만 14세 이상을 대상으로 합니다.',
          '이용자는 계정 정보를 정확하게 유지하고, 비밀번호를 안전하게 관리할 책임이 있습니다. 계정의 무단 사용을 인지한 경우 즉시 회사에 알려야 합니다.',
        ],
      },
      {
        heading: '제6조 (이용자의 의무)',
        body: [
          '이용자는 다음 행위를 하여서는 안 됩니다.',
          '· 타인의 정보를 도용하거나 허위 정보를 등록하는 행위',
          '· 서비스의 정상적인 운영을 방해하는 행위',
          '· 법령 또는 공서양속에 위반되는 콘텐츠를 입력하는 행위',
          '· 회사의 지식재산권 등 권리를 침해하는 행위',
        ],
      },
      {
        heading: '제7조 (콘텐츠와 데이터)',
        body: [
          '이용자가 입력한 콘텐츠에 대한 권리는 이용자에게 있습니다. 다만 이용자는 회사가 서비스의 제공·운영·개선, 신규 기능 및 사전(데이터) 개발, 통계 작성, 품질 향상을 위하여 콘텐츠를 사용·저장·복제·수정·분석·가공할 수 있는 전 세계적·무상·비독점적 라이선스를 회사에 부여합니다. 개인정보의 처리는 개인정보처리방침을 따릅니다.',
          '회사가 개인을 식별할 수 없도록 비식별·통계 처리한 정보는 본 약관 및 개인정보처리방침의 제한 없이 회사에 귀속되며, 회사는 이를 제한 없이 보존·이용할 수 있습니다.',
          '로그인하지 않은 상태의 기록은 이용자의 기기에만 저장되며, 기기 변경·데이터 삭제 시 복구되지 않을 수 있습니다. 회사는 이러한 로컬 데이터의 손실에 대하여 책임지지 않습니다.',
        ],
      },
      {
        heading: '제8조 (서비스의 제공 및 변경·중단)',
        body: [
          '회사는 연중무휴 서비스 제공을 위해 노력하나, 점검·장애·천재지변 등 사유로 서비스의 전부 또는 일부를 변경하거나 중단할 수 있습니다.',
          '무료로 제공되는 서비스의 변경·중단에 대하여 회사는 관련 법령에 특별한 규정이 없는 한 별도의 보상을 하지 않습니다.',
        ],
      },
      {
        heading: '제9조 (지식재산권)',
        body: ['서비스 및 그에 포함된 소프트웨어·디자인·사전 데이터 등에 대한 지식재산권은 회사 또는 정당한 권리자에게 있으며, 이용자는 이를 무단으로 복제·배포·이용할 수 없습니다.'],
      },
      {
        heading: '제10조 (면책 및 책임의 제한)',
        body: [
          '서비스는 "있는 그대로(as-is)" 제공되며, 회사는 서비스가 제공하는 분석·지표·AI 생성 결과의 정확성·완전성·특정 목적에의 적합성을 명시적·묵시적으로 보증하지 않습니다.',
          '회사는 천재지변, 이용자의 귀책, 제3자 서비스의 장애 등 회사의 합리적 통제를 벗어난 사유로 인한 손해에 대하여 책임을 지지 않습니다.',
          '관련 법령이 허용하는 범위에서, 회사의 손해배상책임 총액은 이용자가 손해 발생 직전 6개월 동안 해당 서비스 이용 대가로 회사에 실제 지불한 금액을 한도로 하며, 회사는 간접·부수적·특별·결과적 손해에 대하여 책임을 지지 않습니다. 다만 회사의 고의 또는 중대한 과실로 인한 손해에는 본 항의 제한이 적용되지 않습니다.',
          '이용자가 본 약관 또는 관련 법령을 위반하여 회사 또는 제3자에게 손해를 발생시키거나 분쟁을 야기한 경우, 이용자는 자신의 비용과 책임으로 이를 해결하고 회사를 면책하여야 합니다.',
        ],
      },
      {
        heading: '제11조 (계약 해지)',
        body: ['이용자는 언제든지 회원 탈퇴를 통해 이용계약을 해지할 수 있습니다. 회사는 이용자가 약관을 위반한 경우 사전 통지 후(긴급한 경우 사후 통지) 이용을 제한하거나 계약을 해지할 수 있습니다.'],
      },
      {
        heading: '제12조 (준거법 및 관할)',
        body: [
          '본 약관은 대한민국 법령에 따라 해석되며, 서비스 이용과 관련한 분쟁은 「민사소송법」상 관할 법원을 제1심 관할로 합니다.',
          `· 문의: ${COMPANY.email}`,
        ],
      },
    ],
  },

  en: {
    title: 'Terms of Service',
    updated: `Effective ${COMPANY.effective}`,
    intro: `These Terms govern the rights and obligations between ${COMPANY.nameEn} ("Company") and users regarding ${COMPANY.service} ("Service"). The Korean version prevails in case of any discrepancy.`,
    sections: [
      { heading: 'Article 1 (Purpose)', body: ['These Terms set out the conditions and procedures for using the Service and the rights, obligations, and responsibilities of the Company and users.'] },
      {
        heading: 'Article 2 (Definitions)',
        body: [
          '· "Service": a wellness and life-logging tool for recording hard-to-recall words and revisiting them with same-category words',
          '· "User": members and non-members who agree to these Terms and use the Service',
          '· "Member": a person who registers an account to use the Service on an ongoing basis',
          '· "Content": all information a user enters, such as words, notes, and tags',
        ],
      },
      {
        heading: 'Article 3 (Effect and Amendment)',
        body: [
          'These Terms take effect when posted within the Service.',
          'The Company may amend these Terms within the bounds of law, announcing the effective date and content in advance. Continued use after changes constitutes acceptance.',
        ],
      },
      {
        heading: 'Article 4 (Nature of the Service)',
        body: [
          'The Service is a wellness and life-logging tool that helps record and practice word recall.',
          'It is not intended to diagnose, predict, screen for, or treat any disease, and is not a medical device. Consult a professional for any health-related decisions.',
        ],
      },
      {
        heading: 'Article 5 (Registration and Accounts)',
        body: [
          'You may register with an email and password per the Company’s procedure. The Service is intended for users aged 14 and over.',
          'You are responsible for keeping your account information accurate and your password secure, and must notify the Company immediately of any unauthorized use.',
        ],
      },
      {
        heading: 'Article 6 (User Obligations)',
        body: [
          'You must not:',
          '· impersonate others or register false information',
          '· interfere with the normal operation of the Service',
          '· enter content that violates law or public order',
          '· infringe the Company’s intellectual property or other rights',
        ],
      },
      {
        heading: 'Article 7 (Content and Data)',
        body: [
          'You retain rights to the content you enter. However, you grant the Company a worldwide, royalty-free, non-exclusive license to use, store, reproduce, modify, analyze, and process your content to provide, operate, and improve the Service, develop new features and dictionary data, compile statistics, and enhance quality. Processing of personal data follows the Privacy Policy.',
          'Information that the Company de-identifies or aggregates so that individuals cannot be identified belongs to the Company without the restrictions of these Terms or the Privacy Policy, and the Company may retain and use it without limitation.',
          'Records created while not signed in are stored only on your device and may not be recoverable if the device changes or data is deleted; the Company is not responsible for the loss of such local data.',
        ],
      },
      {
        heading: 'Article 8 (Provision, Change, and Suspension)',
        body: [
          'The Company strives to provide the Service continuously but may change or suspend all or part of it due to maintenance, faults, force majeure, and similar causes.',
          'For free services, the Company provides no separate compensation for such changes or suspensions unless required by law.',
        ],
      },
      { heading: 'Article 9 (Intellectual Property)', body: ['Intellectual property in the Service, including software, design, and dictionary data, belongs to the Company or rightful owners and may not be copied, distributed, or used without authorization.'] },
      {
        heading: 'Article 10 (Disclaimer and Limitation of Liability)',
        body: [
          'The Service is provided "as is," and the Company makes no express or implied warranty as to the accuracy, completeness, or fitness for a particular purpose of any analyses, indicators, or AI-generated results.',
          'The Company is not liable for damages arising from causes beyond its reasonable control, such as force majeure, user fault, or third-party service failures.',
          'To the extent permitted by law, the Company’s total liability is limited to the amount you actually paid the Company for the relevant Service during the six months before the damage occurred, and the Company is not liable for indirect, incidental, special, or consequential damages. This limitation does not apply to damages caused by the Company’s intent or gross negligence.',
          'If you cause damage to the Company or a third party, or give rise to a dispute, by violating these Terms or applicable law, you shall resolve it at your own cost and responsibility and hold the Company harmless.',
        ],
      },
      { heading: 'Article 11 (Termination)', body: ['You may terminate at any time by withdrawing membership. The Company may, after notice (or with subsequent notice in urgent cases), restrict use or terminate if you breach these Terms.'] },
      {
        heading: 'Article 12 (Governing Law and Jurisdiction)',
        body: ['These Terms are governed by the laws of the Republic of Korea, and disputes are subject to the competent court under the Korean Civil Procedure Act as the court of first instance.', `· Contact: ${COMPANY.email}`],
      },
    ],
  },

  ja: {
    title: '利用規約',
    updated: `施行日 ${COMPANY.effective}`,
    intro: `本規約は、${COMPANY.nameKo}（${COMPANY.nameEn}、以下「当社」）が提供する ${COMPANY.service}（以下「本サービス」）の利用に関する、当社と利用者の権利・義務を定めます。相違がある場合は韓国語版が優先します。`,
    sections: [
      { heading: '第1条（目的）', body: ['本規約は、本サービスの利用条件・手続、当社と利用者の権利・義務・責任事項を定めることを目的とします。'] },
      {
        heading: '第2条（定義）',
        body: [
          '· 「本サービス」：思い出しにくい単語を記録し、同分類の単語で振り返るウェルネス・ライフログツール',
          '· 「利用者」：本規約に同意し本サービスを利用する会員および非会員',
          '· 「会員」：アカウントを登録し継続的に本サービスを利用する者',
          '· 「コンテンツ」：利用者が入力・記録した単語、メモ、タグ等の一切の情報',
        ],
      },
      {
        heading: '第3条（規約の効力および変更）',
        body: ['本規約はサービス画面に掲示することで効力を生じます。', '当社は関連法令に反しない範囲で規約を変更でき、変更時は施行日と内容を事前に告知します。変更後も利用を継続する場合、変更に同意したものとみなします。'],
      },
      {
        heading: '第4条（サービスの内容・性格）',
        body: ['本サービスは語彙の想起記録と練習を助けるウェルネス・ライフログツールです。', '本サービスは疾病の診断・予測・選別・治療を目的とせず、医療機器ではありません。健康に関する判断は必ず専門家にご相談ください。'],
      },
      {
        heading: '第5条（会員登録およびアカウント）',
        body: ['利用者は当社所定の手続に従い、メールとパスワードで会員登録できます。本サービスは14歳以上を対象とします。', '利用者はアカウント情報を正確に保ち、パスワードを安全に管理する責任があります。アカウントの無断使用を認知した場合、直ちに当社へ通知してください。'],
      },
      {
        heading: '第6条（利用者の義務）',
        body: ['利用者は次の行為をしてはなりません。', '· 他人の情報の盗用または虚偽情報の登録', '· サービスの正常な運営の妨害', '· 法令または公序良俗に反するコンテンツの入力', '· 当社の知的財産権等の権利の侵害'],
      },
      {
        heading: '第7条（コンテンツとデータ）',
        body: ['利用者が入力したコンテンツの権利は利用者に帰属します。ただし利用者は、当社がサービスの提供・運営・改善、新機能および辞書（データ）の開発、統計作成、品質向上のためにコンテンツを使用・保存・複製・修正・分析・加工できる、全世界的・無償・非独占的なライセンスを当社に付与します。個人情報の処理はプライバシーポリシーに従います。', '当社が個人を識別できないよう非識別化・統計処理した情報は、本規約およびプライバシーポリシーの制限なく当社に帰属し、当社は制限なくこれを保存・利用できます。', '未ログイン状態の記録は利用者の端末にのみ保存され、端末変更・データ削除時に復旧できないことがあります。当社はこのローカルデータの損失について責任を負いません。'],
      },
      {
        heading: '第8条（提供・変更・中断）',
        body: ['当社は継続的な提供に努めますが、点検・障害・天災地変等により全部または一部を変更・中断することがあります。', '無料で提供されるサービスの変更・中断について、当社は法令に特別の定めがない限り別途の補償を行いません。'],
      },
      { heading: '第9条（知的財産権）', body: ['本サービスおよびそれに含まれるソフトウェア・デザイン・辞書データ等の知的財産権は当社または正当な権利者に帰属し、利用者は無断で複製・配布・利用できません。'] },
      {
        heading: '第10条（免責および責任の制限）',
        body: ['本サービスは「現状有姿（as-is）」で提供され、当社は提供する分析・指標・AI生成結果の正確性・完全性・特定目的への適合性について明示的にも黙示的にも保証しません。', '当社は天災地変、利用者の帰責、第三者サービスの障害等、当社の合理的支配を超える事由による損害について責任を負いません。', '法令が許容する範囲で、当社の損害賠償責任の総額は、利用者が損害発生直前6か月間に当該サービスの利用対価として当社に実際に支払った金額を限度とし、当社は間接的・付随的・特別・結果的損害について責任を負いません。ただし当社の故意または重大な過失による損害には本項の制限は適用されません。', '利用者が本規約または関連法令に違反して当社または第三者に損害を与え、または紛争を生じさせた場合、利用者は自らの費用と責任でこれを解決し、当社を免責しなければなりません。'],
      },
      { heading: '第11条（契約の解除）', body: ['利用者はいつでも退会により利用契約を解除できます。当社は利用者が規約に違反した場合、事前通知後（緊急時は事後通知）に利用を制限または契約を解除できます。'] },
      {
        heading: '第12条（準拠法および管轄）',
        body: ['本規約は大韓民国の法令に従って解釈され、本サービスに関する紛争は韓国民事訴訟法上の管轄裁判所を第一審の管轄とします。', `· お問い合わせ：${COMPANY.email}`],
      },
    ],
  },
};
