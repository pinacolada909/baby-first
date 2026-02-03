export interface FaqItem {
  id: string
  category: 'feeding' | 'sleep' | 'health' | 'development' | 'safety' | 'emotional'
  question_en: string
  answer_en: string
  question_zh: string
  answer_zh: string
}

export const faqData: FaqItem[] = [
  // ── Feeding (3) ──────────────────────────────────────────────
  {
    id: 'feeding-1',
    category: 'feeding',
    question_en: 'How often should I feed my newborn?',
    answer_en:
      'Newborns typically feed 8-12 times per day, roughly every 2-3 hours. Watch for hunger cues such as rooting, lip smacking, and hand-to-mouth movements rather than strictly watching the clock.',
    question_zh: '新生儿应该多久喂一次？',
    answer_zh:
      '新生儿通常每天喂 8-12 次，大约每 2-3 小时一次。注意观察饥饿信号，如寻乳反射、舔嘴唇和手放到嘴边的动作，而不是严格按照时间表。',
  },
  {
    id: 'feeding-2',
    category: 'feeding',
    question_en: 'How do I know if my baby is getting enough milk?',
    answer_en:
      'Signs of adequate intake include 6-8 wet diapers per day after the first week, steady weight gain (about 150-200g per week), and your baby appearing content after feedings. Your pediatrician will monitor growth at checkups.',
    question_zh: '怎么知道宝宝是否吃够了奶？',
    answer_zh:
      '足够摄入的标志包括：第一周后每天 6-8 片湿尿布，体重稳定增长（每周约 150-200 克），以及宝宝在喂奶后表现满足。儿科医生会在检查时监测生长情况。',
  },
  {
    id: 'feeding-3',
    category: 'feeding',
    question_en: 'What is the difference between breastmilk, formula, and ready-to-feed?',
    answer_en:
      'Breastmilk provides optimal nutrition and antibodies. Powdered formula is cost-effective but requires careful preparation with boiled water. Ready-to-feed formula is pre-mixed and sterile, convenient for travel but more expensive. All are safe options when used as directed.',
    question_zh: '母乳、配方奶和即饮奶有什么区别？',
    answer_zh:
      '母乳提供最佳营养和抗体。奶粉性价比高，但需要用开水仔细冲泡。即饮奶是预混合的无菌产品，出行方便但价格较高。按照说明使用，这些都是安全的选择。',
  },

  // ── Sleep (3) ────────────────────────────────────────────────
  {
    id: 'sleep-1',
    category: 'sleep',
    question_en: 'How many hours should a newborn sleep per day?',
    answer_en:
      'Newborns typically sleep 14-17 hours per day in short stretches of 2-4 hours. Their sleep-wake cycles are driven by feeding needs. By 3 months, some babies begin sleeping longer stretches at night.',
    question_zh: '新生儿每天应该睡多少小时？',
    answer_zh:
      '新生儿通常每天睡 14-17 小时，分成 2-4 小时的短时段。他们的睡眠-清醒周期由喂养需求驱动。到 3 个月大时，有些宝宝开始在夜间睡更长的时段。',
  },
  {
    id: 'sleep-2',
    category: 'sleep',
    question_en: 'What is the safest sleeping position for a newborn?',
    answer_en:
      'Always place your baby on their back to sleep on a firm, flat surface. Remove loose blankets, pillows, and stuffed animals from the sleep area. Room-sharing without bed-sharing is recommended for the first 6-12 months.',
    question_zh: '新生儿最安全的睡眠姿势是什么？',
    answer_zh:
      '始终让宝宝仰卧在坚固平坦的表面上睡觉。移除睡眠区域内的松散毯子、枕头和毛绒玩具。建议在前 6-12 个月内同室不同床。',
  },
  {
    id: 'sleep-3',
    category: 'sleep',
    question_en: 'How do I establish a bedtime routine for my baby?',
    answer_en:
      'Start a simple routine around 6-8 weeks: a warm bath, gentle massage, dimming lights, soft music or white noise, and a final feeding. Keep it consistent and calming. Even young babies benefit from predictable pre-sleep cues.',
    question_zh: '如何为宝宝建立睡前例程？',
    answer_zh:
      '在 6-8 周左右开始简单的例程：温水澡、轻柔按摩、调暗灯光、轻柔音乐或白噪音，以及最后一次喂奶。保持一致和平静。即使很小的宝宝也会受益于可预测的睡前信号。',
  },

  // ── Health (3) ───────────────────────────────────────────────
  {
    id: 'health-1',
    category: 'health',
    question_en: 'When should I take my newborn to the doctor?',
    answer_en:
      'Schedule the first checkup within 3-5 days after birth. Seek immediate care for fever above 38C (100.4F), difficulty breathing, refusal to feed, persistent vomiting, or unusual lethargy. Trust your instincts.',
    question_zh: '什么时候应该带新生儿去看医生？',
    answer_zh:
      '出生后 3-5 天内安排第一次检查。如果出现体温超过 38°C、呼吸困难、拒绝进食、持续呕吐或异常嗜睡，请立即就医。相信你的直觉。',
  },
  {
    id: 'health-2',
    category: 'health',
    question_en: 'How do I care for the umbilical cord stump?',
    answer_en:
      'Keep the stump clean and dry. Fold the diaper below it to allow air circulation. It usually falls off in 1-3 weeks. Avoid submerging the area in water until it falls off. Contact your doctor if you notice redness, swelling, or a foul smell.',
    question_zh: '如何护理脐带残端？',
    answer_zh:
      '保持残端清洁干燥。将尿布折叠到下方以便空气流通。通常在 1-3 周内脱落。在脱落之前避免将该区域浸入水中。如果发现发红、肿胀或异味，请联系医生。',
  },
  {
    id: 'health-3',
    category: 'health',
    question_en: 'What vaccinations does my newborn need in the first 3 months?',
    answer_en:
      'The Hepatitis B vaccine is typically given at birth. At the 2-month visit, babies usually receive DTaP, IPV, Hib, PCV13, and Rotavirus vaccines. Your pediatrician will provide a complete schedule based on local guidelines.',
    question_zh: '新生儿在前三个月需要什么疫苗？',
    answer_zh:
      '乙肝疫苗通常在出生时接种。在 2 个月的就诊中，宝宝通常会接种百白破、脊灰、Hib、肺炎球菌和轮状病毒疫苗。儿科医生会根据当地指南提供完整的时间表。',
  },

  // ── Development (3) ─────────────────────────────────────────
  {
    id: 'development-1',
    category: 'development',
    question_en: 'What milestones should I expect in the first 3 months?',
    answer_en:
      'By 1 month: brief eye contact, responds to sounds. By 2 months: social smiling, smoother movements, briefly lifts head during tummy time. By 3 months: follows objects, recognizes faces, begins babbling, stronger head control.',
    question_zh: '前三个月应该期待哪些发育里程碑？',
    answer_zh:
      '1 个月：短暂眼神接触，对声音有反应。2 个月：社交性微笑，动作更流畅，趴着时能短暂抬头。3 个月：追踪物体，认出面孔，开始咿呀学语，头部控制更强。',
  },
  {
    id: 'development-2',
    category: 'development',
    question_en: 'How much tummy time does my baby need?',
    answer_en:
      'Start with short sessions of 1-2 minutes several times a day right from birth. Gradually increase to a total of about 15-30 minutes spread throughout the day by 2-3 months. Tummy time strengthens neck, shoulder, and arm muscles.',
    question_zh: '宝宝需要多少趴着的时间？',
    answer_zh:
      '从出生开始，每天进行几次 1-2 分钟的短时段。到 2-3 个月时，逐渐增加到全天约 15-30 分钟。趴着的时间可以增强颈部、肩部和手臂肌肉。',
  },
  {
    id: 'development-3',
    category: 'development',
    question_en: 'How can I stimulate my newborn\'s brain development?',
    answer_en:
      'Talk, sing, and read to your baby frequently. Provide high-contrast visual stimuli (black and white patterns). Respond to their cues consistently. Skin-to-skin contact, gentle rocking, and face-to-face interaction all support healthy brain development.',
    question_zh: '如何促进新生儿的大脑发育？',
    answer_zh:
      '经常和宝宝说话、唱歌、读书。提供高对比度的视觉刺激（黑白图案）。持续回应他们的信号。肌肤接触、轻柔摇晃和面对面互动都有助于健康的大脑发育。',
  },

  // ── Safety (3) ──────────────────────────────────────────────
  {
    id: 'safety-1',
    category: 'safety',
    question_en: 'How do I bathe my newborn safely?',
    answer_en:
      'Give sponge baths until the umbilical cord stump falls off. Use lukewarm water (around 37C / 98.6F), test with your elbow or wrist. Never leave the baby unattended near water. Keep a firm hold at all times and have all supplies within reach.',
    question_zh: '如何安全地给新生儿洗澡？',
    answer_zh:
      '在脐带残端脱落之前使用海绵擦浴。使用温水（约 37°C），用肘部或手腕测试水温。绝对不要让宝宝在水边无人看管。始终保持稳固的握持，并将所有用品放在伸手可及的地方。',
  },
  {
    id: 'safety-2',
    category: 'safety',
    question_en: 'What is the correct way to install a car seat for my newborn?',
    answer_en:
      'Use a rear-facing infant car seat installed in the back seat. The seat should not move more than 2.5 cm (1 inch) side to side. The harness should be snug with the chest clip at armpit level. Many fire stations and hospitals offer free installation checks.',
    question_zh: '如何正确安装新生儿汽车座椅？',
    answer_zh:
      '使用后向式婴儿汽车座椅安装在后排座位。座椅左右移动不应超过 2.5 厘米。安全带应贴合，胸部卡扣位于腋下水平。许多消防站和医院提供免费安装检查。',
  },
  {
    id: 'safety-3',
    category: 'safety',
    question_en: 'How can I prevent Sudden Infant Death Syndrome (SIDS)?',
    answer_en:
      'Place baby on their back to sleep, use a firm mattress with a fitted sheet, avoid soft bedding. Keep the room at a comfortable temperature and avoid overheating. Offer a pacifier at sleep time. Avoid smoke exposure. Breastfeeding also reduces risk.',
    question_zh: '如何预防婴儿猝死综合征（SIDS）？',
    answer_zh:
      '让宝宝仰卧入睡，使用带有贴合床单的硬床垫，避免柔软的床上用品。保持房间温度舒适，避免过热。睡觉时可以给安抚奶嘴。避免烟雾暴露。母乳喂养也能降低风险。',
  },

  // ── Emotional (3) ───────────────────────────────────────────
  {
    id: 'emotional-1',
    category: 'emotional',
    question_en: 'How do I cope with sleep deprivation as a new parent?',
    answer_en:
      'Sleep when the baby sleeps, even for short naps. Accept help from family and friends. Share nighttime duties with a partner. Prioritize rest over housework. If exhaustion feels overwhelming, speak with your healthcare provider about support options.',
    question_zh: '作为新手父母，如何应对睡眠不足？',
    answer_zh:
      '宝宝睡的时候你也睡，即使是短暂的小睡。接受家人和朋友的帮助。与伴侣分担夜间职责。优先休息而非家务。如果疲惫感过于强烈，请咨询医疗保健提供者了解支持选项。',
  },
  {
    id: 'emotional-2',
    category: 'emotional',
    question_en: 'Is it normal to feel overwhelmed with a newborn?',
    answer_en:
      'Absolutely. The transition to parenthood is one of the most significant life changes. "Baby blues" affecting mood for the first 2 weeks are common. However, if feelings of sadness, anxiety, or hopelessness persist beyond 2 weeks, please reach out to a healthcare provider about postpartum depression.',
    question_zh: '有了新生儿后感到不知所措正常吗？',
    answer_zh:
      '完全正常。成为父母是人生最重大的变化之一。前两周的"产后情绪低落"影响心情是常见的。但如果悲伤、焦虑或绝望的感觉持续超过两周，请联系医疗保健提供者了解产后抑郁症。',
  },
  {
    id: 'emotional-3',
    category: 'emotional',
    question_en: 'How can I bond with my baby in the first 3 months?',
    answer_en:
      'Skin-to-skin contact, responsive feeding, eye contact, and talking or singing to your baby all strengthen the bond. Babywearing, infant massage, and simply being present and attentive during daily care routines also foster deep connection.',
    question_zh: '前三个月如何与宝宝建立亲密关系？',
    answer_zh:
      '肌肤接触、按需喂养、眼神交流以及和宝宝说话或唱歌都能加强亲密关系。婴儿背带、婴儿按摩，以及在日常照护中保持在场和关注也能培养深层联系。',
  },
]
