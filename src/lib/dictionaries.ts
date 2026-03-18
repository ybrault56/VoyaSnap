import type { Locale } from "./types";

type TravelerDictionary = {
  common: {
    submit: string;
    admin: string;
    player: string;
    tracking: string;
    language: string;
    moderation: string;
    schedule: string;
  };
  home: {
    eyebrow: string;
    title: string;
    intro: string;
    ctaPrimary: string;
    ctaSecondary: string;
    featurePricingTitle: string;
    featurePricingBody: string;
    featureQueueTitle: string;
    featureQueueBody: string;
    featureModerationTitle: string;
    featureModerationBody: string;
    stepsTitle: string;
    steps: string[];
  };
  submit: {
    title: string;
    subtitle: string;
    quoteTitle: string;
    payButton: string;
    voucherPlaceholder: string;
    noRepeat: string;
    eta: string;
    total: string;
    occurrences: string;
  };
  tracking: {
    title: string;
    subtitle: string;
    status: string;
    eta: string;
    firstPlay: string;
    window: string;
    notifications: string;
    slots: string;
    voucher: string;
  };
};

const dictionaries: Record<Locale, TravelerDictionary> = {
  fr: {
    common: {
      submit: "Commander",
      admin: "Moderation",
      player: "Player",
      tracking: "Suivi",
      language: "Langue",
      moderation: "Moderation humaine",
      schedule: "Planning dynamique",
    },
    home: {
      eyebrow: "Diffusion touristique sur ecran geant",
      title: "Diffusez vos souvenirs de voyage sur le grand ecran de la ville.",
      intro:
        "Un QR code ouvre un parcours mobile-first: media, duree, rediffusion, creneau, paiement puis moderation.",
      ctaPrimary: "Commencer une commande",
      ctaSecondary: "Voir le suivi d'un ordre",
      featurePricingTitle: "Tarification en temps reel",
      featurePricingBody:
        "Le prix evolue selon le type de media, la duree, la frequence et la tension du creneau.",
      featureQueueTitle: "ETA estime apres paiement",
      featureQueueBody:
        "Le voyageur recoit une estimation de premiere diffusion selon la charge planifiee.",
      featureModerationTitle: "Moderation avant diffusion",
      featureModerationBody:
        "Chaque commande payee passe dans la file de moderation avant reservation des slots.",
      stepsTitle: "Parcours v1",
      steps: [
        "Scanner le QR code et ouvrir l'application mobile.",
        "Choisir image, video muette ou message puis configurer la diffusion.",
        "Obtenir un devis instantane et payer la commande.",
        "Recevoir la confirmation, l'ETA puis la diffusion apres validation.",
      ],
    },
    submit: {
      title: "Nouvelle commande",
      subtitle:
        "Chargez votre contenu, choisissez votre fenetre de diffusion et obtenez le prix instantanement.",
      quoteTitle: "Devis instantane",
      payButton: "Payer et reserver",
      voucherPlaceholder: "Code promo optionnel",
      noRepeat: "Une seule diffusion",
      eta: "Premiere diffusion estimee",
      total: "Total",
      occurrences: "Nombre de passages",
    },
    tracking: {
      title: "Suivi de commande",
      subtitle: "Retrouvez ici le statut, la moderation, les notifications et le planning reserve.",
      status: "Statut",
      eta: "ETA",
      firstPlay: "Premiere diffusion",
      window: "Fenetre demandee",
      notifications: "Notifications email",
      slots: "Creneaux reserves",
      voucher: "Code promo",
    },
  },
  en: {
    common: {
      submit: "Book now",
      admin: "Moderation",
      player: "Player",
      tracking: "Tracking",
      language: "Language",
      moderation: "Human moderation",
      schedule: "Dynamic schedule",
    },
    home: {
      eyebrow: "Tourist giant screen booking",
      title: "Broadcast your travel memories on the city's giant screen.",
      intro:
        "The QR flow lets visitors upload media, choose a slot, pay, then wait for moderation and scheduling.",
      ctaPrimary: "Start a booking",
      ctaSecondary: "Open order tracking",
      featurePricingTitle: "Live pricing",
      featurePricingBody:
        "Pricing changes with media type, duration, repeat interval and slot pressure.",
      featureQueueTitle: "ETA after payment",
      featureQueueBody:
        "Each paid order receives an estimated first play time based on current schedule load.",
      featureModerationTitle: "Moderation before playback",
      featureModerationBody:
        "Every paid booking enters a human moderation queue before slots are confirmed.",
      stepsTitle: "v1 flow",
      steps: [
        "Scan the QR code and open the mobile app.",
        "Choose image, muted video or text message and configure playback.",
        "Get an instant quote and pay for the order.",
        "Receive confirmation, ETA and playback after moderation approval.",
      ],
    },
    submit: {
      title: "New booking",
      subtitle:
        "Upload your content, choose your preferred window and get instant pricing.",
      quoteTitle: "Instant quote",
      payButton: "Pay and book",
      voucherPlaceholder: "Optional voucher code",
      noRepeat: "One-time playback",
      eta: "Estimated first play",
      total: "Total",
      occurrences: "Playback count",
    },
    tracking: {
      title: "Order tracking",
      subtitle: "Review order status, moderation updates, notifications and reserved slots.",
      status: "Status",
      eta: "ETA",
      firstPlay: "First play",
      window: "Requested window",
      notifications: "Email notifications",
      slots: "Reserved slots",
      voucher: "Voucher",
    },
  },
  ru: {
    common: {
      submit: "Оформить",
      admin: "Модерация",
      player: "Плеер",
      tracking: "Отслеживание",
      language: "Язык",
      moderation: "Ручная модерация",
      schedule: "Динамическое расписание",
    },
    home: {
      eyebrow: "Туристический гигантский экран",
      title: "Покажите свои воспоминания о путешествии на большом городском экране.",
      intro:
        "QR-код открывает мобильный путь: медиа, длительность, повтор, окно показа, оплата и модерация.",
      ctaPrimary: "Начать заказ",
      ctaSecondary: "Открыть отслеживание",
      featurePricingTitle: "Динамическая цена",
      featurePricingBody:
        "Цена зависит от типа медиа, длительности, повтора и загрузки выбранного окна.",
      featureQueueTitle: "ETA после оплаты",
      featureQueueBody:
        "После оплаты путешественник получает оценку первой трансляции с учетом текущей очереди.",
      featureModerationTitle: "Модерация до показа",
      featureModerationBody:
        "Каждый оплаченный заказ проходит ручную модерацию перед бронированием слотов.",
      stepsTitle: "Сценарий v1",
      steps: [
        "Сканируйте QR-код и откройте мобильное приложение.",
        "Выберите фото, видео без звука или текст и настройте показ.",
        "Получите мгновенный расчет и оплатите заказ.",
        "Получите подтверждение, ETA и показ после одобрения.",
      ],
    },
    submit: {
      title: "Новый заказ",
      subtitle:
        "Загрузите контент, выберите окно показа и получите цену мгновенно.",
      quoteTitle: "Мгновенный расчет",
      payButton: "Оплатить и забронировать",
      voucherPlaceholder: "Промокод",
      noRepeat: "Один показ",
      eta: "Оценка первого показа",
      total: "Итого",
      occurrences: "Количество показов",
    },
    tracking: {
      title: "Отслеживание заказа",
      subtitle: "Проверьте статус, модерацию, уведомления и забронированные слоты.",
      status: "Статус",
      eta: "ETA",
      firstPlay: "Первый показ",
      window: "Запрошенное окно",
      notifications: "Email-уведомления",
      slots: "Забронированные слоты",
      voucher: "Промокод",
    },
  },
  "zh-Hans": {
    common: {
      submit: "下单",
      admin: "审核后台",
      player: "播放端",
      tracking: "订单跟踪",
      language: "语言",
      moderation: "人工审核",
      schedule: "动态排期",
    },
    home: {
      eyebrow: "旅游大屏投放",
      title: "把你的旅行回忆展示在城市巨幕上。",
      intro:
        "扫码后进入移动端流程: 选择内容、时长、重播频率、时间窗口、支付与审核。",
      ctaPrimary: "开始下单",
      ctaSecondary: "查看订单",
      featurePricingTitle: "实时定价",
      featurePricingBody: "价格会根据媒体类型、时长、重播频率和档期紧张度变化。",
      featureQueueTitle: "支付后预计时间",
      featureQueueBody: "支付完成后，系统会根据当前队列给出首次播放预计时间。",
      featureModerationTitle: "播放前人工审核",
      featureModerationBody: "所有已支付订单都要先进入人工审核，再锁定播放时段。",
      stepsTitle: "v1 流程",
      steps: [
        "扫描二维码并打开移动应用。",
        "选择图片、静音视频或文字并设置播放参数。",
        "获取即时报价并完成支付。",
        "收到确认、预计时间，并在审核通过后播放。",
      ],
    },
    submit: {
      title: "新订单",
      subtitle: "上传内容，选择期望时间窗口，并即时获取报价。",
      quoteTitle: "即时报价",
      payButton: "支付并预订",
      voucherPlaceholder: "优惠码（可选）",
      noRepeat: "仅播放一次",
      eta: "预计首次播放时间",
      total: "总价",
      occurrences: "播放次数",
    },
    tracking: {
      title: "订单跟踪",
      subtitle: "查看订单状态、审核结果、通知和已预订时段。",
      status: "状态",
      eta: "预计时间",
      firstPlay: "首次播放",
      window: "所选时间窗口",
      notifications: "邮件通知",
      slots: "已预订时段",
      voucher: "优惠码",
    },
  },
  es: {
    common: {
      submit: "Reservar",
      admin: "Moderacion",
      player: "Player",
      tracking: "Seguimiento",
      language: "Idioma",
      moderation: "Moderacion humana",
      schedule: "Planificacion dinamica",
    },
    home: {
      eyebrow: "Pantalla gigante para turistas",
      title: "Muestra tus recuerdos de viaje en la gran pantalla de la ciudad.",
      intro:
        "El flujo QR permite subir contenido, elegir franja horaria, pagar y esperar la moderacion.",
      ctaPrimary: "Crear pedido",
      ctaSecondary: "Abrir seguimiento",
      featurePricingTitle: "Precio en tiempo real",
      featurePricingBody:
        "El precio cambia segun el tipo de contenido, la duracion, la repeticion y la ocupacion.",
      featureQueueTitle: "ETA despues del pago",
      featureQueueBody:
        "Cada pedido pagado recibe una hora estimada de primera emision segun la carga actual.",
      featureModerationTitle: "Moderacion antes de emitir",
      featureModerationBody:
        "Todos los pedidos pagados pasan por moderacion humana antes de reservar los slots.",
      stepsTitle: "Flujo v1",
      steps: [
        "Escanear el QR y abrir la aplicacion movil.",
        "Elegir imagen, video sin audio o mensaje y configurar la emision.",
        "Obtener un presupuesto instantaneo y pagar el pedido.",
        "Recibir confirmacion, ETA y emision tras la aprobacion.",
      ],
    },
    submit: {
      title: "Nuevo pedido",
      subtitle:
        "Sube tu contenido, elige la ventana de emision y recibe el precio al instante.",
      quoteTitle: "Presupuesto instantaneo",
      payButton: "Pagar y reservar",
      voucherPlaceholder: "Codigo promocional opcional",
      noRepeat: "Una sola emision",
      eta: "Primera emision estimada",
      total: "Total",
      occurrences: "Numero de emisiones",
    },
    tracking: {
      title: "Seguimiento del pedido",
      subtitle: "Consulta el estado, la moderacion, las notificaciones y los slots reservados.",
      status: "Estado",
      eta: "ETA",
      firstPlay: "Primera emision",
      window: "Ventana solicitada",
      notifications: "Notificaciones por email",
      slots: "Slots reservados",
      voucher: "Codigo promocional",
    },
  },
};

export function getDictionary(locale: Locale) {
  return dictionaries[locale];
}

export type { TravelerDictionary };
