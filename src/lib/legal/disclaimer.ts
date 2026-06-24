import type { LegalContent } from './types';
import { COMPANY } from './types';

// 면책조항 — 의료기기 비해당·정보 한계·책임 제한. intended-use.md의 사용목적 선언문과 정합.

export const DISCLAIMER: LegalContent = {
  ko: {
    title: '면책조항',
    updated: `시행일 ${COMPANY.effective}`,
    intro: `${COMPANY.service}(이하 "서비스") 이용 시 아래 면책 사항을 확인하시기 바랍니다.`,
    sections: [
      {
        heading: '1. 의료적 목적이 아님',
        body: [
          '본 서비스는 일상에서 떠오르지 않는 단어를 가볍게 기록하고 되짚어 보는 웰니스·생활기록 도구입니다.',
          '본 서비스는 질병(치매, 경도인지장애 등 포함)의 진단·예측·선별(screening)·치료를 목적으로 하지 않으며, 의료기기가 아닙니다. 서비스가 제공하는 점수·라벨·인지 관련 표현은 건강 상태에 대한 의학적 판단이 아닙니다.',
        ],
      },
      {
        heading: '2. 전문가 상담 권고',
        body: ['기억·인지·언어와 관련하여 우려가 있는 경우, 본 서비스의 결과에 의존하지 마시고 반드시 의사 등 자격을 갖춘 전문가와 상담하시기 바랍니다. 본 서비스는 전문적 진단·치료를 대체하지 않습니다.'],
      },
      {
        heading: '3. 정보의 정확성',
        body: ['서비스가 제공하는 분석·통계·또래 비교·AI 생성 유사어 등은 참고용이며, 정확성·완전성·적시성을 보증하지 않습니다. 어휘 사전 및 등급 정보는 공개 자료에 기반하며 오류가 있을 수 있습니다.'],
      },
      {
        heading: '4. AI 생성 결과의 한계',
        body: ['사전에 없는 단어에 대한 유사어는 AI가 생성할 수 있으며, 부정확하거나 부적절한 결과가 포함될 수 있습니다. 해당 기능 이용 시 입력 단어의 처리는 개인정보처리방침을 따릅니다.'],
      },
      {
        heading: '5. 데이터 및 서비스 중단에 대한 책임 제한',
        body: [
          '로그인하지 않은 기록은 이용자 기기에만 저장되며, 기기 변경·브라우저 데이터 삭제 등으로 소실될 수 있습니다. 회사는 이러한 로컬 데이터의 손실에 대해 책임지지 않습니다.',
          '회사는 점검·장애·천재지변·제3자 서비스 문제 등 합리적 통제를 벗어난 사유로 인한 서비스 중단 및 그로 인한 손해에 대해 관련 법령이 허용하는 범위에서 책임을 지지 않습니다.',
        ],
      },
      {
        heading: '6. 책임의 한계',
        body: [
          '관련 법령이 허용하는 최대 범위에서, 회사는 서비스 이용 또는 이용 불가로 인한 간접·부수적·결과적 손해에 대하여 책임을 지지 않습니다.',
          `· 문의: ${COMPANY.email}`,
        ],
      },
    ],
  },

  en: {
    title: 'Disclaimer',
    updated: `Effective ${COMPANY.effective}`,
    intro: `Please review the following before using ${COMPANY.service} ("Service"). The Korean version prevails in case of any discrepancy.`,
    sections: [
      {
        heading: '1. Not for Medical Purposes',
        body: [
          'The Service is a wellness and life-logging tool for casually recording and revisiting words that are hard to recall.',
          'It is not intended to diagnose, predict, screen for, or treat any disease (including dementia or mild cognitive impairment) and is not a medical device. Any scores, labels, or cognition-related wording are not medical judgments about your health.',
        ],
      },
      { heading: '2. Consult a Professional', body: ['If you have concerns about memory, cognition, or language, do not rely on the Service’s results; consult a qualified professional such as a physician. The Service does not replace professional diagnosis or treatment.'] },
      { heading: '3. Accuracy of Information', body: ['Analyses, statistics, peer comparisons, and AI-generated related words are for reference only and are not guaranteed to be accurate, complete, or timely. Vocabulary and grade data are based on public sources and may contain errors.'] },
      { heading: '4. Limits of AI Output', body: ['Related words for terms not in the dictionary may be AI-generated and may include inaccurate or inappropriate results. Processing of the words you enter follows the Privacy Policy.'] },
      {
        heading: '5. Data and Service Interruption',
        body: [
          'Records created while not signed in are stored only on your device and may be lost if the device changes or browser data is cleared. The Company is not responsible for loss of such local data.',
          'The Company is not liable, to the extent permitted by law, for interruptions or resulting damages caused by maintenance, faults, force majeure, or third-party service issues beyond its reasonable control.',
        ],
      },
      {
        heading: '6. Limitation of Liability',
        body: ['To the maximum extent permitted by law, the Company is not liable for indirect, incidental, or consequential damages arising from use or inability to use the Service.', `· Contact: ${COMPANY.email}`],
      },
    ],
  },

  ja: {
    title: '免責事項',
    updated: `施行日 ${COMPANY.effective}`,
    intro: `${COMPANY.service}（以下「本サービス」）のご利用にあたり、以下の免責事項をご確認ください。相違がある場合は韓国語版が優先します。`,
    sections: [
      {
        heading: '1. 医療目的ではありません',
        body: [
          '本サービスは、日常で思い出せない単語を気軽に記録し振り返るウェルネス・ライフログツールです。',
          '本サービスは疾病（認知症、軽度認知障害等を含む）の診断・予測・選別・治療を目的とせず、医療機器ではありません。提供されるスコア・ラベル・認知に関する表現は、健康状態に関する医学的判断ではありません。',
        ],
      },
      { heading: '2. 専門家への相談', body: ['記憶・認知・言語に関して不安がある場合は、本サービスの結果に依存せず、必ず医師等の有資格専門家にご相談ください。本サービスは専門的な診断・治療に代わるものではありません。'] },
      { heading: '3. 情報の正確性', body: ['提供される分析・統計・同年代比較・AI生成の類義語等は参考用であり、正確性・完全性・適時性を保証しません。語彙辞書および等級情報は公開資料に基づき、誤りを含むことがあります。'] },
      { heading: '4. AI生成結果の限界', body: ['辞書にない単語の類義語はAIが生成することがあり、不正確または不適切な結果を含む場合があります。当該機能利用時の入力単語の処理はプライバシーポリシーに従います。'] },
      {
        heading: '5. データおよびサービス中断に関する責任制限',
        body: [
          '未ログインの記録は利用者端末にのみ保存され、端末変更・ブラウザデータ削除等で消失することがあります。当社はこのローカルデータの損失について責任を負いません。',
          '当社は点検・障害・天災地変・第三者サービスの問題等、合理的支配を超える事由によるサービス中断およびそれによる損害について、法令が許容する範囲で責任を負いません。',
        ],
      },
      {
        heading: '6. 責任の限界',
        body: ['法令が許容する最大限の範囲で、当社は本サービスの利用または利用不能による間接的・付随的・結果的損害について責任を負いません。', `· お問い合わせ：${COMPANY.email}`],
      },
    ],
  },
};
