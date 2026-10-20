(function (root) {
  const classAssignments = [
    ['7A', 'Ketut Agustiana, S.Pd.B.', 'I Wayan Sumendra, S.Ag.'],
    ['7B', 'Edmunda Paulina Wea, S.Pd.', 'I Made Merta, S.Pd., M.Pd.'],
    ['7C', 'I Nyoman Tri Sumedana, S.Pd.', 'Ni Made Sthiti Nur Hita, S.Pd.'],
    ['7D', 'I Gusti Ayu Aditya Dewi, S.Pd.', 'Ida Bagus Dalem Wisnu Arcana, S.Pd.'],
    ['7E', 'Ni Putu Yuli Arianti, S.Pd.H.', 'Dewa Ayu Eka Pebriyanti, S.Pd.'],
    ['7F', 'Putu Desi Arnadi, S.Pd.', 'Ni Kadek Dewi Asih, S.Pd.'],
    ['7G', 'Ni Made Anggreni Dwikasihati, S.Pd.', 'Hadi Rustini, S.Pd.'],
    ['7H', 'Sheila Mahesa Putri, S.Pd.', 'Brigita Diny Laksitasari, S.Pd.'],
    ['7I', 'Ni Luh Putu Sudartini, S.Pd.', 'Dra. Ni Made Surtini'],
    ['7J', 'Ni Komang Milla Yanti, S.Pd.', 'I Gusti Ayu Eka Karyati, S.Pd.'],
    ['8A', 'Husnanda Arief Adhandika, S.Pd.', 'Ni Wayan Mila Agustini, S.Pd.'],
    ['8B', 'Fachriza Wilasita Karunia, S.Pd.', 'I Kadek Yogik Artha, S.Pd.'],
    ['8C', 'Ni Luh Eva Lidyantari, S.Pd.', 'Gek Putu Nita Ardelia, S.Pd.'],
    ['8D', 'Ni Putu Eka Novitri, S.Pd.', 'Ni Pt. Dian Widya Kencana, S.S.'],
    ['8E', 'Ni Putu Yanti Widiantari, S.Pd.', 'Ni Made Abdi Cahyani, S.T., S.Pd.'],
    ['8F', 'Danang Cahya Saputra, S.Pd.', 'I Putu Riska Permana, S.Pd.'],
    ['8G', 'Dewa Putu Prasetya Wijaksana, S.Pd.', 'Ni Putu Indah Sri Wahyuni, S.Pd.'],
    ['8H', 'A.A. Marini Megawati, S.E.', 'Ni Komang Lisna Tri Utami, S.Pd.'],
    ['8I', 'Kadek Dwi Indah Rahayu, S.Pd.', 'I Gusti Ngurah Gede Sugiartha, S.Sn.'],
    ['8J', 'I Made Dharma Negara, S.Pd.', 'Gede Guna Parmanto, S.Pd.'],
    ['9A', 'Ni Luh Lina Parwati, S.Pd.', 'Ni Komang Lisna Tri Utami, S.Pd.'],
    ['9B', 'I Dewa Ayu Gede Suwari Ratih, S.Pd.', 'A.A. Mas Oka, S.Pd.'],
    ['9C', 'Kadek Lifa Wahyuni, S.Pd.', 'I Made Agus Kencana Yasa, S.E., S.Pd.'],
    ['9D', 'Eva Sujiati, S.Pd.', 'Gede Yayan Sedana, S.Pd.'],
    ['9E', 'I Gusti Agung Niti Wahyuni Putri, S.Pd.', 'Gede Yayan Sedana, S.Pd.'],
    ['9F', 'Ni Komang Murdani, S.Pd.', 'I Kadek Gunarsa, S.Pd.'],
    ['9G', 'Gusti Ayu Putu Arik Antari, S.Pd.', 'I Kadek Gunarsa, S.Pd.'],
    ['9H', 'Ni Made Metriani, S.Pd.', 'Ida Bagus Made Surya Dwipayana, S.Pd.'],
    ['9I', 'I Dewa Gede Ananda Iswara Pramidana, S.Pd.', 'Ida Bagus Made Surya Dwipayana, S.Pd.']
  ];

  const piketNames = [
    'I Made Merta, S.Pd., M.Pd.', 'I Gede Guna Parmanto, S.Pd.',
    'I Kadek Gunarsa, S.Pd.', 'Gede Yayan Sedana, S.Pd.',
    'Ni Komang Lisna Tri Utami, S.Pd.', 'I Gusti Agung Niti Wahyuni Putri, S.Pd.',
    'Dewa Ayu Gede Suwari Ratih, S.Pd.', 'Dewa Ayu Eka Pebriyanti, S.Pd.',
    'Ni Putu Yuli Arianti, S.Pd.H.', 'I Putu Riska Permana, S.Pd.',
    'A.A. Mas Oka, S.Pd.', 'Ni Made Abdi Cahyani, S.T., S.Pd.',
    'Gek Putu Nita Ardelia, S.Pd.', 'Ni Komang Murdani, S.Pd.',
    'Ni Putu Eka Novitri, S.Pd.', 'I Gusti Ayu Eka Karyati, S.Pd.',
    'Putu Desi Arnadi, S.Pd.', 'Ni Komang Mila Yanti, S.Pd.',
    'Gst. Ngr. Gd. Sugiarta, S.Sn.', 'I.B. Made Surya Dwipayana, S.Pd.',
    'Ni Luh Lina Parwati, S.Pd.', 'Eva Sujiati, S.Pd.',
    'Gst. Ayu Putu Arik Antari, S.Pd.', 'Ni Putu Indah Sri Wahyuni, S.Pd.',
    'Danang Cahya Saputra, S.Pd.', 'Dewa Putu Prasetya Wijaksana, S.Pd.',
    'I Made Agus Kencana Yasa, S.E., S.Pd.', 'I Wayan Sumendra, S.Ag.',
    'Ni Made Metriani, S.Pd.', 'I Kadek Yogik Artha, S.Pd.',
    'Hadi Rustini, S.Pd.', 'Anak Agung Marini Megawati, S.E.',
    'Brigita Diny Laksitasari, S.Pd.'
  ];

  const degreeSuffixes = ['spdb', 'spdh', 'spd', 'mpd', 'sag', 'ssn', 'se', 'st', 'ss'];
  const normalizeName = name => {
    let compact = String(name || '').normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
    let changed = true;
    while (changed) {
      changed = false;
      for (const suffix of degreeSuffixes) {
        if (compact.endsWith(suffix)) {
          compact = compact.slice(0, -suffix.length);
          changed = true;
          break;
        }
      }
    }
    return compact;
  };
  const slug = value => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const aliases = {
    anakagungmarinimegawati: 'aamarinimegawati',
    dewaayugedesuwaratih: 'idewaayugedesuwaratih',
    igedegunaparmanto: 'gedegunaparmanto',
    gstngrgdsugiarta: 'igustingurahgedesugiartha',
    ibmadesuryadwipayana: 'idabagusmadesuryadwipayana',
    gstayuputuarikantari: 'gustiayuputuarikantari',
    nikomangmilyanti: 'nikomangmillyanti'
  };
  const canonicalNames = {
    aamarinimegawati: 'A.A. Marini Megawati, S.E.',
    idewaayugedesuwaratih: 'I Dewa Ayu Gede Suwari Ratih, S.Pd.',
    gedegunaparmanto: 'Gede Guna Parmanto, S.Pd.',
    igustingurahgedesugiartha: 'I Gusti Ngurah Gede Sugiartha, S.Sn.',
    idabagusmadesuryadwipayana: 'Ida Bagus Made Surya Dwipayana, S.Pd.',
    gustiayuputuarikantari: 'Gusti Ayu Putu Arik Antari, S.Pd.',
    nikomangmillyanti: 'Ni Komang Milla Yanti, S.Pd.'
  };
  const records = new Map();
  const add = (name, type, classId = null) => {
    const normalized = normalizeName(name);
    const key = aliases[normalized] || normalized;
    if (!key) return;
    if (!records.has(key)) records.set(key, { id: `t-${slug(key)}`, name: canonicalNames[key] || name, teacherTypes: [], waliClasses: [] });
    const record = records.get(key);
    if (!record.teacherTypes.includes(type)) record.teacherTypes.push(type);
    if (classId && !record.waliClasses.includes(classId)) record.waliClasses.push(classId);
  };

  piketNames.forEach(name => add(name, 'piket'));
  classAssignments.forEach(([classId, wali, guruWali]) => {
    add(wali, 'wali', classId);
    add(guruWali, 'wali', classId);
  });

  const directory = [...records.values()].sort((a, b) => a.name.localeCompare(b.name, 'id'));
  const classIds = Array.from({ length: 3 }, (_, gradeIndex) =>
    [...'ABCDEFGHIJ'].map(letter => `${gradeIndex + 7}${letter}`)
  ).flat();
  const exported = { classAssignments, directory, classIds };
  if (typeof module !== 'undefined' && module.exports) module.exports = exported;
  else root.AVENTRA_TEACHER_DIRECTORY = exported;
})(typeof window !== 'undefined' ? window : globalThis);
