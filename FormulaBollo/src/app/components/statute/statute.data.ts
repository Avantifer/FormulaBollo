export interface StatuteItem {
  mark: string;
  lead?: string;
  text: string;
}

export interface StatuteArticle {
  id: string;
  number: string;
  title: string;
  paragraphs: string[];
  items?: StatuteItem[];
  afterItems?: string[];
}

export interface StatuteSection {
  id: string;
  label: string;
  title: string;
  intro: string[];
  articles: StatuteArticle[];
}

export const STATUTE: {
  title: string;
  subtitle: string;
  preamble: StatuteSection;
  sections: StatuteSection[];
  finalProvision: { title: string; paragraphs: string[]; signature: string };
} = {
  title: 'Estatuto oficial',
  subtitle: 'Funcionamiento del Mundial F1 Bollo',
  preamble: {
    id: 'preambulo',
    label: '',
    title: 'Preámbulo',
    intro: [
      'Este campeonato de ámbito nacional fue creado por el actual presidente, director y máxima autoridad, Jose Alberto López Monreal, aquí en adelante “Bollo”.',
      'El Mundial f1 Bollo fue creado gracias a una idea del gran presidente, el día 26 de marzo del año 2023, en una conversación con los otros 2 pilotos que conforman la cúpula del evento, el sr “Bubapu” y “Moraga”.',
      'Este campeonato fue diseñado con el propósito de juntar a los mejores pilotos para que lucharan por la consecución del ansiado título de campeón bollo.',
      'En sus inicios, el mundial estuvo constituido por 20 pilotos, 2 de ellos abandonaron la disciplina de sus escuderías y fueron sustituidos por los pilotos “AvantiFer” y “Albertomd”, del equipo Aston Martin y Williams Racing.',
      'Los presentes estatutos fueron elaborados por nuestro majestuoso presidente, el señor Bollo, con la finalidad de dejar de forma escrita el estricto funcionamiento del torneo, para una mejor comprensión y visualización de las normativas y sanciones.'
    ],
    articles: []
  },
  sections: [
    {
      id: 'titulo-preliminar',
      label: 'Título preliminar',
      title: 'De los principios generales',
      intro: [
        'Este Título Preliminar versará acerca de los principios regidores del modelo de competitividad y respeto a los participantes de este campeonato, siendo el incumplimiento de los mismos un motivo de sanción grave dentro del modelo de sanciones que se desarrollarán posteriormente en el Título quinto de los presentes Estatutos.'
      ],
      articles: [
        {
          id: 'articulo-1',
          number: '1',
          title: 'Deportividad y respeto',
          paragraphs: [
            'La deportividad, junto con el respeto, entre los pilotos será el principal de los principios que regirán esta competición, siendo sancionables el incumplimiento de ambos.',
            'Se exigirá un modelo de conducción estándar que respete el normal funcionamiento de las carreras, que no entorpezca al resto de compañeros, ni perjudique los tiempos, estrategias y vueltas de clasificación. El incumplimiento podrá ser sancionado con faltas desde leves hasta muy graves dependiendo del perjuicio que ocasione el incumplimiento del mismo.',
            'En cuanto al respeto entre pilotos será motivo de sanción y correspondiente falta muy grave el incumplimiento del mismo.'
          ]
        },
        {
          id: 'articulo-2',
          number: '2',
          title: 'Sinceridad',
          paragraphs: [
            'La sinceridad es otro de los principios regidores de este mismo campeonato. Muy necesario el cumplimiento del mismo a la hora de reconocer errores y facilitar la labor de los jueces a la hora de poner las sanciones. También muy importante a la hora de realizar las votaciones de las fechas y horarios de celebración de las carreras.'
          ]
        },
        {
          id: 'articulo-3',
          number: '3',
          title: 'Compromiso',
          paragraphs: [
            'El compromiso será otro de los principios generales de funcionamiento del campeonato. Cabe recordar que los pilotos que en su día aceptaron incorporarse al mismo dieron su compromiso con otros 19 pilotos más los sustitutos que posteriormente se unieron. Puntuamos individualmente, pero jugamos en comunidad.',
            'El incumplimiento de este principio tendrá sanción, desde leve hasta la expulsión del campeonato de escuderías.'
          ]
        }
      ]
    },
    {
      id: 'titulo-1',
      label: 'Título I',
      title: 'De la Dirección',
      intro: [
        'En este título primero desarrollamos el funcionamiento de la dirección del campeonato, describiendo los cargos, titulares de los mismos y funciones de cada puesto.'
      ],
      articles: [
        {
          id: 'articulo-4',
          number: '4',
          title: 'El Presidente.',
          paragraphs: [
            'El Presidente de este mundial, impuesto de forma unilateral, es el sr Bollo.',
            'Sus funciones son de coordinación, funcionamiento, establecimiento de fechas, contacto permanente con los titulares de las escuderías y pilotos sustitutos, imposición de sanciones, figura por la cual han de pasar todas las iniciativas y el único autorizado de tomar todas y cada una de las medidas que se adopten, siendo iniciativa propia o a petición de algún interesado, la cual analizará y dictará.'
          ]
        },
        {
          id: 'articulo-5',
          number: '5',
          title: 'Vicepresidente.',
          paragraphs: [
            'El vicepresidente de este mundial, puesto a dedo por el Presidente del mismo, es el señor Bubapu.',
            'Sus funciones son el auxilio del Presidente en el ejercicio de sus funciones, coordinación e imposición de sanciones, recepción de los videos de incidentes a realizar y coordinación y estructuración de carrera y reglajes.'
          ]
        },
        {
          id: 'articulo-6',
          number: '6',
          title: 'Alta Autoridad.',
          paragraphs: [
            'La alta autoridad es un puesto inventado y puesto a dedo por el Presidente del campeonato, reside en el señor Moraga.',
            'Sus funciones realmente no tienen ningún tipo de importancia en el desarrollo del mundial, simplemente quería destacar que esta en todos los grupos, ve todos los videos, opina, pero sus valoraciones tienen la misma validez que las de cualquier piloto u espectador. Igualmente forma parte de la cúpula.'
          ]
        },
        {
          id: 'articulo-7',
          number: '7',
          title: 'La FIA.',
          paragraphs: [
            'Es el órgano colegiado encargado de visualizar los videos de los incidentes e imponer las sanciones que se estimen oportunas.',
            'Está constituido por el Presidente del Mundial, el Vicepresidente del Mundial, El presidente de la FIA y la alta autoridad, aunque este último componente solo asiste a las sanciones sin posibilidad de voto.'
          ]
        },
        {
          id: 'articulo-8',
          number: '8',
          title: 'El Presidente de la FIA.',
          paragraphs: [
            'El Presidente de la FIA, órgano puesto a dedo por los señores Presidente y Vicepresidente del mundial, siendo la máxima autoridad a la hora de imponer las sanciones de los incidentes de carrera. Antonio Mesa es el titular.',
            'Para garantizar los principios de deportividad, respeto y sinceridad, el señor presidente decidió nombrar para esta función a una persona externa al mundial, es por eso mismo que el presidente del órgano encargado de imponer sanciones no es piloto.'
          ]
        },
        {
          id: 'articulo-9',
          number: '9',
          title: 'El director ejecutivo de las carreras.',
          paragraphs: [
            'El director ejecutivo de carreras, órgano puesto a dedo por la cúpula del mundial, es Robesfc.',
            'Sus funciones son de crear las carreras y configurar la misma con las medidas decididas por el Vicepresidente no electo Bubapu.'
          ]
        }
      ]
    },
    {
      id: 'titulo-2',
      label: 'Título II',
      title: 'De las escuderías.',
      intro: [
        'Este título desarrollará la composición del Mundial F1 Bollo, el cual, está formado por las escuderías oficiales de la F1.'
      ],
      articles: [
        {
          id: 'articulo-10',
          number: '10',
          title: 'Alpine.',
          paragraphs: [
            'Bollo e Ismallen son los pilotos oficiales de esta escudería'
          ]
        },
        {
          id: 'articulo-11',
          number: '11',
          title: 'Ferrari.',
          paragraphs: [
            'Robesfc y fernandohuerta son los pilotos oficiales de esta escudería.'
          ]
        },
        {
          id: 'articulo-12',
          number: '12',
          title: 'RedBull.',
          paragraphs: [
            'Bubapu y Moraga son los pilotos oficiales de esta escudería.'
          ]
        },
        {
          id: 'articulo-13',
          number: '13',
          title: 'Aston Martin.',
          paragraphs: [
            'AvantiFer y El Jupa son los pilotos oficiales de esta escudería. Minuto de silencio por el expiloto Jolomo.'
          ]
        },
        {
          id: 'articulo-14',
          number: '14',
          title: 'Williams Racing.',
          paragraphs: [
            'Smokingweedkush y Albertomd son los pilotos oficiales de esta escudería. Minuto de silencio por el piloto que jamás apareció, Daniel.'
          ]
        },
        {
          id: 'articulo-15',
          number: '15',
          title: 'Mclaren.',
          paragraphs: [
            'Jesusfuentes y Farmiid son los pilotos oficiales de esta escudería. Minuto de silencio para el que esté cerca en una salida.'
          ]
        },
        {
          id: 'articulo-16',
          number: '16',
          title: 'Haas.',
          paragraphs: [
            'Alberto x2 son los pilotos oficiales de esta escudería.'
          ]
        },
        {
          id: 'articulo-17',
          number: '17',
          title: 'Alfa Romeo.',
          paragraphs: [
            'Pepeperez y Muchasalsa son los pilotos oficiales de esta escudería.'
          ]
        },
        {
          id: 'articulo-18',
          number: '18',
          title: 'Mercedes.',
          paragraphs: [
            'Dani Calde y Wendiego son los pilotos oficiales de esta escudería.'
          ]
        },
        {
          id: 'articulo-19',
          number: '19',
          title: 'Alpha Tauri.',
          paragraphs: [
            'Escapin y Mante son los pilotos oficiales de esta escudería.'
          ]
        },
        {
          id: 'articulo-20',
          number: '20',
          title: 'Posibles cambios.',
          paragraphs: [
            'Los motivos por los cuales pudieren ocasionarse estos cambios serán sanciones reiteradas, sanciones por el incumplimiento de los principios desarrollados en el Título preliminar, o por renuncia de los propios pilotos titulares.',
            'Las vacantes serán cubiertas por los pilotos participantes en la sección de reservas Fórmula Jotabetrbb.'
          ]
        },
        {
          id: 'articulo-21',
          number: '21',
          title: 'Funcionamiento del mundial de escuderías.',
          paragraphs: [
            'Se contarán los puntos adquiridos por los pilotos oficiales y sustitutos que participen en lugar de los titulares.'
          ]
        }
      ]
    },
    {
      id: 'titulo-3',
      label: 'Título III',
      title: 'De la Fórmula Jotabetrbb',
      intro: [],
      articles: [
        {
          id: 'articulo-22',
          number: '22',
          title: 'Funcionamiento.',
          paragraphs: [
            'Esta categoría se configura como la categoría de plata del mundial.',
            'Los puntos de las carreras que los participantes de esta categoría adquieran contabilizarán para la clasificación oficial del Mundial F1 Bollo.',
            'El propósito de esta misma categoría es dar competitividad a los reservas que no pudieron entrar en el Mundial F1 Bollo por diferentes motivos. Se valorará en el formato de esta competición la limpieza en carrera, siendo El Presidente y el Vicepresidente los encargados de analizar y asignar las puntuaciones de cada piloto en cada carrera. Estos puntos se contarán y se configurarán mediante una media aritmética para incorporarse a una clasificación, a través de la cual los pilotos podrán ascender por orden de méritos y cubrir esas vacantes ocasionadas por los motivos expuestos en el artículo 20.'
          ]
        },
        {
          id: 'articulo-23',
          number: '23',
          title: 'Criterios de puntuación.',
          paragraphs: [
            'Para calcular los puntos se seguirán los siguientes criterios:'
          ],
          items: [
            {
              mark: 'a)',
              lead: 'Incidentes',
              text: 'los incidentes ocasionados restarán puntos.'
            },
            {
              mark: 'b)',
              lead: 'Curvas',
              text: 'se valorará de forma positiva la buena trazabilidad.'
            },
            {
              mark: 'c)',
              lead: 'Respeto',
              text: 'se valorará de forma muy positiva el respeto en los adelantamientos y a la hora de dejar pasar cuando fuere necesario.'
            },
            {
              mark: 'd)',
              lead: 'Cuidado',
              text: 'se valorará de forma muy positiva el tener cuidado y no ocasionar peligro dentro de la pista.'
            }
          ]
        },
        {
          id: 'articulo-24',
          number: '24',
          title: 'Grupo de Whatsapp.',
          paragraphs: [
            'El Presidente creará un grupo de Whatsapp con los pilotos de fórmula jotabetrbb para la mejor coordinación y contacto.'
          ]
        }
      ]
    },
    {
      id: 'titulo-4',
      label: 'Título IV',
      title: 'De las carreras.',
      intro: [
        'Este título desarrollará el funcionamiento de las carreras desde la encuesta de selección hasta la postcarrera.'
      ],
      articles: [
        {
          id: 'articulo-25',
          number: '25',
          title: 'Encuestas.',
          paragraphs: [
            'Las encuestas se llevarán a cabo por el grupo de Solo Encuestas y se regirán por el principio de Sinceridad desarrollado en el artículo 2.',
            'Para el normal funcionamiento se exigirá que todos los pilotos voten de forma sincera los días y horas a las que pueden jugar, alejándose de motivos que pudieren entorpecer el normal desarrollo de la misma.',
            'Cabe recordar que esto es un videojuego, no podemos estar pendiente de las prioridades de cada uno, solo pedimos que se vote con sinceridad, el motivo de la falta es irrelevante.',
            'Una vez establecido el horario de la carrera, el piloto que no votase esa opción no podrá participar en la misma, pasando su puesto a un reserva participante del Formula Jotabetrbb.',
            'Puede haber excepciones justificadas al Presidente del Mundial, que será el encargado de valorar y sentenciar la situación.'
          ]
        },
        {
          id: 'articulo-26',
          number: '26',
          title: 'Hora de la carrera.',
          paragraphs: [
            'La hora y el día de la carrera serán inamovibles, empezando a la hora citada con una posible prórroga breve y previamente avisado el motivo que ocasione la tardanza. El tiempo máximo de espera se establece en 12 minutos desde la hora acordada.'
          ]
        },
        {
          id: 'articulo-27',
          number: '27',
          title: 'Clasificación.',
          paragraphs: [
            'La clasificación será corta y se valorará el respeto por los principios desarrollados en el Título preliminar, siendo motivo de sanción el incumplimiento del mismo.'
          ]
        },
        {
          id: 'articulo-28',
          number: '28',
          title: 'Carrera.',
          paragraphs: [
            'La carrera será al 50%, se correrán los 22 circuitos disponibles en el videojuego y se velará por el respeto de los principios generales desarrollados en el Título preliminar, siendo motivo de sanción el incumplimiento del mismo.'
          ]
        },
        {
          id: 'articulo-29',
          number: '29',
          title: 'Post Carrera.',
          paragraphs: [
            'El post se realizará en la sala general de discord fórmula bollo, en la cual se hablará de los incidentes y aspectos de la carrera. Se velará por el cumplimiento del principio de respeto recogido en el artículo 1 de los presentes estatutos siendo motivo de sanción muy grave el incumplimiento del mismo.'
          ]
        },
        {
          id: 'articulo-30',
          number: '30',
          title: 'Videos de incidentes.',
          paragraphs: [
            'Los videos serán enviados por los pilotos al Presidente y Vicepresidente para que sean tratados por el grupo de la FIA. Se podrán comentar en el grupo oficial del mundial preservando siempre el respeto y deportividad entre pilotos.'
          ]
        }
      ]
    },
    {
      id: 'titulo-5',
      label: 'Título V',
      title: 'De las sanciones.',
      intro: [
        'Este título desarrollará resumidamente el funcionamiento de la imposición de sanciones.'
      ],
      articles: [
        {
          id: 'articulo-31',
          number: '31',
          title: 'Comisarios.',
          paragraphs: [
            'Grupo de Whatsapp formado por el Presidente no electo y el vicepresidente puesto a dedo, en el cual se hablará con los pilotos que tuvieren alguna consideración acerca de la sanción impuesta.'
          ]
        },
        {
          id: 'articulo-31-bis',
          number: '31',
          title: 'La FIA',
          paragraphs: [
            'Analizará y sancionará todos los incidentes de carrera recogidos mediante las grabaciones de los pilotos. Nunca serán sancionados incidentes no expuestos en medios tipificacos como prueba legal.'
          ]
        },
        {
          id: 'articulo-32',
          number: '32',
          title: 'Proporcionalidad en las sanciones.',
          paragraphs: [
            'Las sanciones serán impuestas en función de la gravedad del hecho que motive la misma, pudiendo estas ser:'
          ],
          items: [
            {
              mark: 'a)',
              lead: 'Leve',
              text: 'lances básicos de carrera o falta leve al principio de compromiso.'
            },
            {
              mark: 'b)',
              lead: 'Grave',
              text: 'dos faltas leves, incidentes más graves de carrera o falta grave al principio de compromiso. Se penalizarán con tiempos de carrera.'
            },
            {
              mark: 'c)',
              lead: 'Muy Grave',
              text: 'Reiteración de faltas graves, falta muy grave al principio de compromiso e incumplimiento de los principios generales del campeonato. Se penalizará con la expulsión inmediata del Mundial de escuderías.'
            }
          ]
        },
        {
          id: 'articulo-33',
          number: '33',
          title: 'como 33?',
          paragraphs: [
            'Repíteme ese numerin'
          ]
        },
        {
          id: 'articulo-34',
          number: '34',
          title: 'Esquema de sanciones.',
          paragraphs: [
            'Localizables en el grupo de Whatsapp y difundidos.'
          ]
        },
        {
          id: 'articulo-35',
          number: '35',
          title: 'Sanciones Muy Graves.',
          paragraphs: [
            'Se considerarán muy graves aquellas acciones que hagan peligrar la integridad del campeonato, como el incumplimiento de los principios generales.'
          ]
        }
      ]
    },
    {
      id: 'titulo-6',
      label: 'Título VI',
      title: 'De los premios',
      intro: [],
      articles: [
        {
          id: 'articulo-36',
          number: '36',
          title: 'Premio al mundial de pilotos.',
          paragraphs: [
            'Al finalizar el campeonato mundial se hará entrega del codiciado trofeo de mejor piloto. Será entregado por el Presidente en mano, en el bar “SUIZA”, siempre que el ganador resida en la localidad de Sevilla. Si el ganador fuere de otra localidad será el Vicepresidente el encargado de la entrega del mismo y si esto no es posible será el señor de correos el encargado de ello.'
          ]
        },
        {
          id: 'articulo-37',
          number: '37',
          title: 'Premio al mundial de escuderías.',
          paragraphs: [
            'Al finalizar el campeonato se hará entrega del codiciado trofeo de mejor escudería, un trofeo a cada piloto, en los mismos términos que los indicados en el anterior artículo 36.'
          ]
        },
        {
          id: 'articulo-38',
          number: '38',
          title: 'Coste de los premios.',
          paragraphs: [
            'El señor Presidente se hará cargo del coste de los premios anteriormente expuestos'
          ]
        }
      ]
    },
    {
      id: 'titulo-7',
      label: 'Título VII',
      title: 'De la reforma del presente estatuto.',
      intro: [
        'Debido a que este mundial opera bajo los principios autoritarios del presidente la reforma de los mismos se llevarán a cabo de la misma manera que la elaboración de los mismos, es decir, bajo su criterio y cuando él mismo decida.'
      ],
      articles: []
    }
  ],
  finalProvision: {
    title: 'Disposición final',
    paragraphs: [
      'Viva el Real Betis Balompié.'
    ],
    signature: 'El PRESIDENTE: BOLLO'
  }
};
