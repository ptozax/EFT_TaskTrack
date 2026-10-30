import React from 'react';
import staticTasks from "../data/tasks";
import { getLive } from '../data/gameStore';
// อ่านข้อมูลเควส "สด" จาก store ถ้ามี ไม่งั้น fallback ไฟล์ static ที่ bundle ไว้
const TASKS = () => getLive('tasks') || staticTasks;

const CHEMICAL_ALTERNATIVE_IDS = ['597a0f5686f774273b74f676', '597a160786f77477531d39d2', '597a171586f77405ba6887d3'];
const ONE_LESS_LOOSE_END_ALTERNATIVE_IDS = ['669fa38fad7f1eac2607ed46', '669fa3910c828825de06d69f'];
const COLLEAGUES_3_ALTERNATIVE = ['5edab4b1218d181e29451435', '5edac34d0bb72a50635c2bfa']
const SUPPLY_PLANS_ALTERNETIVE = ['596a0e1686f7741ddf17dbee', '596a101f86f7741ddb481582']

const WET_JOB_5_ACTIVE = {
    trigger: '5a27bc3686f7741c73584026',
    unlocks: ['5a27bc6986f7741c7358402b', '5d6fbc2886f77449d825f9d3']
}
const TROPHY_ACTIVE = {
    trigger: '5d25e2b486f77409de05bba0',
    unlocks: ['5d25e2c386f77443e7549029', '5d25e43786f7740a212217fa']
}
const ICE_CREAM_CONES_ACTIVE = {
    trigger: '59675d6c86f7740a842fc482',
    unlocks: ['59675ea386f77414b32bded2', '596760e186f7741e11214d58']
}
const PVP = {
    trigger: '66058ccde8e4f17985230807',
    unlocks: ['66058ccf06ef1d50a60c1f48', '66058cd19f59e625462acc90', '67e993b1ac26bf29380a320b']
}
const REVISION_RESERVE_ACTIVE = {
    trigger: '5a27b87686f77460de0252a8',
    unlocks: ['6086c852c945025d41566124', '6179b4d1bca27a099552e04e', '639135f286e646067c176a87']
}
const SENSORY_ANALYSIS_1_ACTIVE = {
    trigger: '67a096577e86e067eb045733',
    unlocks: ['67a0967c003a9986cb0f5ac1', '67a096ed77dd677f600804ba']
}
const DISEASE_HISTORY_ACTIVE = {
    trigger: '5969f9e986f7741dde183a50',
    unlocks: ['60896e28e4a85c72ef3fa301', '6179ad56c760af5ad2053587']
}
const HEALTH_CARE_4_ACTIVE = {
    trigger: '5a68665c86f774255929b4c7',
    unlocks: ['5a68667486f7742607157d28', '5d6fb2c086f77449da599c24']
}
const HLEPING_HAND_ACTIVE = {
    trigger: '657315e4a6af4ab4b50f3459',
    unlocks: ['6752f6d83038f7df520c83e8', '673f348dd3346c21670217e7', '673f2cd5d3346c2167020484']
}
const INEVITABLE_RESPONSE_ACTIVE = {
    trigger: '673f5a4976553f78350bdac1',
    unlocks: ['673f6027352b4da8e00322d2', '673f61a066e6a521aa04b62b']
}
const MINIBUS_ACTIVE = {
    trigger: '5ae4493d86f7744b8e15aa8f',
    unlocks: ['5b478d0f86f7744d190d91b5', '6613f3007f6666d56807c929', '66151401efb0539ae10875ae'] // Drip out part 1
}
const FARMING_3_ACTIVE = {
    trigger: '5ac3462b86f7741d6118b983',
    unlocks: ['5ac3464c86f7741d651d6877', '6179b3a12153c15e937d52bc']
}
const THE_GOOD_TIMES_1_ACTIVE = {
    trigger: '657315df034d76585f032e01',
    unlocks: ['666314b4d7f171c4c20226c3', '666314b0acf8442f8b0531a1']
}
const PUNISHER_5_ACTIVE = {
    trigger: '59ca264786f77445a80ed044',
    unlocks: ['59ca29fb86f77445ab465c87', '6179b5b06e9dd54ac275e409']
}
const WOODS_KEEPER_ACTIVE = {
    trigger: ['5d25e2b486f77409de05bba0', '596a0e1686f7741ddf17dbee'],
    unlocks: ['5d25e2ee86f77443e35162ea', '600302d73b897b11364cd161']
}
const DANDIES_ACTIVE = {
    trigger: '639135a7e705511c8a4a1b78',
    unlocks: ['65734c186dc1e402c80dc19e', '6613f307fca4f2f386029409', '6615141bfda04449120269a7'] // Drip out part 2
}
const HOOBY_CLUB_ACTIVE = {
    trigger: '657315e4a6af4ab4b50f3459',
    unlocks: ['684009026ceedc792c09b2a7', '68400926706e0a55e90b0007']
}

export const FACTION_KEY = 'eft_faction_name';
export const FACTIONS = ['BEAR', 'USEC'];

/**
 * ฝ่ายที่เลือกอยู่ — คืน 'BEAR' หรือ 'USEC' เสมอ
 *
 * AppNavbar เก็บผ่าน JSON.stringify จึงได้ค่าเป็น "USEC" (มีเครื่องหมายคำพูด)
 * แต่ถ้าเคยมีเวอร์ชันไหนเขียนเป็นข้อความดิบ USEC ไว้ JSON.parse จะโยน error
 * -> ที่ไม่มี try/catch (getNextQuestLists) จะพังทั้งฟังก์ชัน
 *    ส่วนที่มี catch ก็เงียบ ๆ ตกไปเป็น BEAR ทั้งที่ผู้เล่นเป็น USEC
 * ตรงนี้รับได้ทั้งสองแบบ และกันค่าแปลกปลอมด้วย
 */
export const getFaction = () => {
    let raw;
    try { raw = localStorage.getItem(FACTION_KEY); } catch { return 'BEAR'; }
    if (!raw) return 'BEAR';
    let value = raw;
    try { const parsed = JSON.parse(raw); if (typeof parsed === 'string') value = parsed; } catch { /* เก็บเป็นข้อความดิบ */ }
    return FACTIONS.includes(value) ? value : 'BEAR';
};

/** เควสนี้เล่นได้ด้วยฝ่ายที่เลือกอยู่ไหม ('Any' = ทุกฝ่าย) */
export const inFaction = (quest, faction = getFaction()) =>
    !quest?.factionName || ['Any', faction].includes(quest.factionName);

const currentFaction = getFaction;

/** เรียงตามลำดับที่เล่นจริง: ลำดับในสายเทรดเดอร์ (จากวิกิ) -> Loyalty Level -> เลเวล -> ชื่อ */
const byProgression = (a, b) =>
    (a.traderRank ?? 999) - (b.traderRank ?? 999)
    || (a.loyalty?.level ?? 99) - (b.loyalty?.level ?? 99)
    || (a.minPlayerLevel || 0) - (b.minPlayerLevel || 0)
    || a.name.localeCompare(b.name);

/**
 * เควสแรกของทุกเทรดเดอร์
 *
 * เดิม hardcode ไว้ 4 ชื่อ (First in Line, Shooting Cans, Burning Rubber, Saving the Mole)
 * แต่ในเกมทุกเทรดเดอร์มีเควสเริ่มต้นของตัวเอง -> อีก 7 เทรดเดอร์ไม่มีจุดเริ่มเลย
 *
 * หาจากข้อมูลแทน: ตัวแรกในลำดับสายของเทรดเดอร์ (traderRank จากตารางในวิกิ)
 * ที่ยังไม่มีเงื่อนไขเควสก่อนหน้า — เงื่อนไขข้อหลังสำคัญ เพราะตารางวิกิบางเทรดเดอร์
 * ขึ้นต้นด้วยเควสกลางสาย (เช่น BTR Driver ขึ้น "Shipping Delay - Part 2" เป็นแถวแรก)
 */
const SPECIAL_UNLOCKS = [
    {
        trigger: '597a0e5786f77426d66c0636',
        unlocks: CHEMICAL_ALTERNATIVE_IDS
    },
    {
        trigger: '6179aff8f57fb279792c60a1',
        unlocks: ONE_LESS_LOOSE_END_ALTERNATIVE_IDS
    },
    {
        trigger: ['5edabd13218d181e29451442', '5edaba7c0c502106f869bc02', '5f04886a3937dc337a6b8238'],
        unlocks: COLLEAGUES_3_ALTERNATIVE
    },
    {
        trigger: '5969f9e986f7741dde183a50',
        unlocks: SUPPLY_PLANS_ALTERNETIVE
    },
    WET_JOB_5_ACTIVE, TROPHY_ACTIVE, ICE_CREAM_CONES_ACTIVE, PVP,
    REVISION_RESERVE_ACTIVE, SENSORY_ANALYSIS_1_ACTIVE, DISEASE_HISTORY_ACTIVE,
    HEALTH_CARE_4_ACTIVE, HLEPING_HAND_ACTIVE, INEVITABLE_RESPONSE_ACTIVE,
    MINIBUS_ACTIVE, FARMING_3_ACTIVE, THE_GOOD_TIMES_1_ACTIVE, PUNISHER_5_ACTIVE,
    WOODS_KEEPER_ACTIVE, DANDIES_ACTIVE, HOOBY_CLUB_ACTIVE,
];

/* เควสที่ต้องมี "ตัวจุดชนวน" ก่อนถึงจะรับได้ แต่ API ให้ taskRequirements = []
   เช่น One Less Loose End / A Healthy Alternative ที่ต้องเก็บไดอารี่จาก Overpopulation ก่อน
   แล้วค่อยเลือกส่งให้ Therapist หรือ Peacekeeper — วิกิเองก็ไม่ได้ใส่ไว้ในช่อง previous
   รายการนี้ในโค้ดเป็นแหล่งเดียวที่รู้ จึงเอามากันไม่ให้ไปโผล่ในข้อเสนอ */
const GATED_IDS = new Set([
    ...SPECIAL_UNLOCKS.flatMap((s) => s.unlocks || []),
    ...CHEMICAL_ALTERNATIVE_IDS,
    ...ONE_LESS_LOOSE_END_ALTERNATIVE_IDS,
    ...COLLEAGUES_3_ALTERNATIVE,
    ...SUPPLY_PLANS_ALTERNETIVE,
]);

export const getStartQuests = () => {
    const faction = currentFaction();
    const first = new Map();
    TASKS()
        .filter(q => (q.taskRequirements || []).length === 0
            && !GATED_IDS.has(q.id)          // เควสทางเลือกไม่ใช่เควสเริ่มต้นของใคร
            && ["Any", faction].includes(q.factionName)
            && q.trader?.name)
        .sort(byProgression)
        .forEach(q => { if (!first.has(q.trader.name)) first.set(q.trader.name, q); });

    /* บางเทรดเดอร์ต้องปลดล็อกด้วยเควสของเทรดเดอร์อื่นก่อน
       (Jaeger: Acquaintance ต้องทำ Introduction ของ Mechanic ก่อน)
       เควสแบบนี้ยังเป็น "เควสแรกของเทรดเดอร์คนนั้น" อยู่ แต่ใส่ตอน reset ไม่ได้
       เพราะยังทำไม่ได้จริง -> ข้ามทั้งเทรดเดอร์ ไม่ถอยไปหยิบเควสถัดไปในสาย

       เคยเขียนไว้ตรงนี้ว่า "เควสปลดล็อกเองจะโผล่มาจากข้อเสนอของเทรดเดอร์ต้นทาง"
       ซึ่งไม่จริง — ทำ Introduction ของ Mechanic เสร็จก็ได้ข้อเสนอของ Mechanic
       ไม่เคยมีของ Jaeger เพราะไม่มีเควสไหนผูก Introduction เป็น taskRequirements
       ตอนนี้ home.jsx อ่าน finishRewards.traderUnlock ตอนกด Complete แทน */
    return [...first.values()].filter(q => (q.wikiPrev || []).length === 0);
};

/**
 * ใส่เควสเริ่มต้นลงรายการ "กำลังทำ"
 *
 * เควสทั้ง 4 ไม่มีเงื่อนไขเควสก่อนหน้า -> getNextQuestLists ไม่มีวันเสนอให้
 * พอ reset แล้วรายการจึงว่างเปล่าและไม่มีจุดเริ่ม ต้องไปค้นชื่อเพิ่มเอง
 * (เดิม getStartQuests มีอยู่แล้วแต่ไม่เคยถูกเรียกจากที่ไหนเลย)
 */
export const seedStartQuests = () => {
    const starters = getStartQuests();
    if (!starters.length) return [];

    let saved = [];
    try { saved = JSON.parse(localStorage.getItem('eft_selected_quests')) || []; } catch { saved = []; }
    const byId = new Map(saved.map(q => [q.id, q]));
    starters.forEach(q => { if (!byId.has(q.id)) byId.set(q.id, q); });

    const next = Array.from(byId.values());
    localStorage.setItem('eft_selected_quests', JSON.stringify(next));
    return starters;
};

/**
 * เควสที่น่าทำต่อของเทรดเดอร์หนึ่ง — ใช้เสนอหลังทำเควสของเทรดเดอร์นั้นเสร็จ
 *
 * 301 จาก 504 เควสไม่มีเงื่อนไขเควสก่อนหน้า (ในเกมปลดล็อกด้วย Loyalty Level
 * + เลเวลผู้เล่น ซึ่งแอปไม่รู้) getNextQuestLists จึงตัดทิ้งหมดด้วยบรรทัด
 * `if (requirements.length === 0) return false;` -> ไม่มีวันถูกเสนอเลย
 *
 * ตรงนี้เสนอให้เลือกเอง ไม่ยัดเข้ารายการอัตโนมัติ และไม่กรองด้วยเลเวลผู้เล่น
 * เรียงตาม Loyalty Level (จากวิกิ) แล้วตามด้วยเลเวลขั้นต่ำ = ลำดับที่ได้เล่นจริง
 */
export const TRADER_LEVELS_KEY = 'eft_trader_levels';
export const MAX_LOYALTY = 4;

/* จำนวนระดับ Loyalty ที่เทรดเดอร์แต่ละคนมีจริงในเกม — ไม่ได้เป็น 4 เท่ากันทุกคน
 *
 * ที่มา: https://json.tarkov.dev/regular/traders ฟิลด์ levels[] (เช็คซ้ำได้ทุกเมื่อ)
 * ไม่ได้อ่านสดผ่าน gameStore เพราะตอน transform มันหยิบไปแค่ชื่อ แล้วทิ้ง levels[]
 * และตัวเลขชุดนี้แทบไม่ขยับ ถ้าวันไหนขยับค่อยต่อสายสดก็ยังทัน
 *
 * Fence มี LL0 อยู่ในข้อมูลด้วย แต่นั่นคือสถานะตอน scav karma ติดลบ
 * ไม่ใช่ระดับที่ไล่ขึ้นไป เลยไม่นับมาเป็นปุ่มให้กด
 *
 * Lightkeeper กับ Btr Driver มีระดับเดียว — ของเดิมให้กด 1-4 ทั้งคู่
 * ทั้งที่ในเกมไม่มีระดับให้ขึ้น */
const TRADER_LOYALTY_CAP = {
    Prapor: 4, Therapist: 4, Skier: 4, Peacekeeper: 4,
    Mechanic: 4, Ragman: 4, Jaeger: 4, Ref: 4,
    Fence: 2,
    Lightkeeper: 1, 'Btr Driver': 1,
};

/** เทรดเดอร์ที่ไม่รู้จัก (คนใหม่หลังอัปเดตเกม) ให้ 4 ไว้ก่อน ดีกว่าหายไปเฉย ๆ */
export const traderLoyaltyCap = (traderName) => TRADER_LOYALTY_CAP[traderName] ?? MAX_LOYALTY;

/** ระดับที่ควรมีปุ่มให้กด — คนที่มีระดับเดียวคืนอาเรย์ว่าง (ไม่ต้องมีปุ่มเลย) */
export const loyaltyLevelsFor = (traderName) => {
    const cap = traderLoyaltyCap(traderName);
    return cap <= 1 ? [] : Array.from({ length: cap }, (_, i) => i + 1);
};

/** Loyalty Level ของผู้เล่นต่อเทรดเดอร์ (กรอกเอง) — ไม่ได้ตั้งไว้ถือว่า 1 */
export const getTraderLevels = () => {
    try { return JSON.parse(localStorage.getItem(TRADER_LEVELS_KEY)) || {}; } catch { return {}; }
};

/** อ่านค่าแบบบีบให้อยู่ในช่วงที่เทรดเดอร์คนนั้นมีจริง
    — ของที่เคยตั้งไว้ตอนปุ่มยังเป็น 1-4 ทุกคน (เช่น Fence = 4) จะได้ไม่ค้างเป็นค่าที่ไม่มีอยู่ */
export const traderLevelOf = (levels, traderName) =>
    Math.min(Math.max(1, levels?.[traderName] ?? 1), traderLoyaltyCap(traderName));

export const setTraderLevel = (traderName, level) => {
    const cap = traderLoyaltyCap(traderName);
    const next = { ...getTraderLevels(), [traderName]: Math.min(cap, Math.max(1, level)) };
    localStorage.setItem(TRADER_LEVELS_KEY, JSON.stringify(next));
    return next;
};

/**
 * @param aboveLevel  เอาเฉพาะเควสที่ต้องการ Loyalty Level สูงกว่าค่านี้
 *                    ใช้ตอน LL ขยับขึ้น เพื่อโชว์เฉพาะ "ของที่เพิ่งเปิด"
 *                    ไม่ปนกับของเดิมที่เห็นมาตั้งแต่ LL ก่อนหน้า
 */
export const getTraderSuggestions = (traderName, { completed = [], active = [], limit = 8, aboveLevel = null } = {}) => {
    if (!traderName) return [];
    const taken = new Set([...completed.map(q => q.id), ...active.map(q => q.id)]);
    /* "ผ่านจุดนั้นมาแล้ว" = อยู่ในประวัติ ไม่ว่าจะเสร็จหรือถูกปิดเพราะเลือกสายอื่น
       นับ failed ด้วยเพราะเควสทางเลือกเป็นพี่น้องกัน และวิกิลงไว้ครบทุกสาย
       เช่น Dragnet มี wikiPrev = [One Less Loose End, A Healthy Alternative]
       ซึ่งเลือกได้ทางเดียวตลอดกาล -> ถ้านับเฉพาะ complete เงื่อนไขจะไม่มีวันเป็นจริง
       ในแอปนี้สถานะ failed เกิดจากกลุ่มเควสทางเลือกเท่านั้น การนับรวมจึงไม่กินเกิน */
    const reached = new Set(completed.map(q => q?.id));
    const faction = currentFaction();
    const myLevel = getTraderLevels()[traderName] ?? 1;

    /* กรองด้วย Loyalty Level ที่ผู้เล่นกรอกเอง — ตัดกองที่ยังเปิดไม่ถึงออก
       (Prapor อยู่ LL1 เหลือ 11 จาก 46)
       เควสที่วิกิไม่บอก LL ให้ผ่านไว้ก่อน ไม่งั้นเทรดเดอร์อย่าง Jaeger
       ที่ไม่มีข้อมูล LL เลย 40 จาก 42 อัน จะไม่เหลืออะไรให้เสนอ */
    return TASKS()
        .filter(q => q.trader?.name === traderName
            && (q.taskRequirements || []).length === 0
            /* วิกิรู้ว่ามีเควสก่อนหน้า แม้ API ไม่รู้ -> เสนอได้ก็ต่อเมื่อทำครบแล้ว
               เดิมบรรทัดนี้คือ `.length === 0` คือตัดทิ้งทุกตัวที่วิกิบอกว่ามีแม่
               ซึ่งตัดแล้วไม่มีอะไรพากลับมาเลย เพราะ getNextQuestLists ดูแต่
               taskRequirements -> 38 เควส (Jaeger 24 / Ragman 13 / Skier 1)
               หายไปจากระบบเสนอทั้งหมด ต้องค้นชื่อเพิ่มเองอย่างเดียว

               ไม่ได้เอา wikiPrev ไปยัดใส่ taskRequirements จริง ๆ ตามที่
               update-quest-links.mjs เตือนไว้ — ใช้แค่เป็นเงื่อนไขว่าจะ "เสนอ"
               ไหมเท่านั้น การนับปลดล็อกของ Home/Kappa จึงไม่ขยับ

               some ไม่ใช่ every: ช่อง previous ของวิกิไม่ได้แปลว่า "ต้องครบทุกตัว"
               หลายหน้าลงไว้ทั้งแถวที่มาก่อน รวมถึงสายที่เลือกได้ทางเดียว
                 Shortage   -> First in Line + Operation Aquarius + Supply Plans
                 Stray Dogs -> Huntsman Path สามอันพร้อมกัน
                 Dragnet    -> One Less Loose End + A Healthy Alternative (เลือกได้ทางเดียว)
               บังคับให้ครบทุกตัวจะได้เงื่อนไขที่เป็นจริงไม่ได้ แล้วลามไปปิดสายทั้งสาย
               (ทดลองแล้ว every ทำให้เข้าไม่ถึง 25 เควส ส่วน some เหลือ 10) */
            && ((q.wikiPrev || []).length === 0 || q.wikiPrev.some(p => reached.has(p)))
            && !GATED_IDS.has(q.id)              // ต้องมีตัวจุดชนวนก่อน (ดูคำอธิบายที่ GATED_IDS)
            && !taken.has(q.id)
            && ["Any", faction].includes(q.factionName)
            && (q.loyalty?.level == null || q.loyalty.level <= myLevel)
            && (aboveLevel == null || (q.loyalty?.level != null && q.loyalty.level > aboveLevel)))
        .sort(byProgression)
        .slice(0, limit);
};

export const getQuestTreeComplete = (startQuestId) => {
    // 1. Get all the IDs recursively
    const allIds = getAllRequirements(startQuestId);

    // 2. Convert the Set of IDs into your desired Array of Objects
    return Array.from(allIds).map(id => ({
        id: id,
        status: 'complete'
    }));
};

export const getPreviousQuestsList = (questId, completedQuests) => {
    // 1. Get the Positive Tree (The quest itself + all recursive parents)
    // Returns array: [{ id: 'parent_id', status: 'complete' }, { id: 'questId', status: 'complete' }]
    const updates = getQuestTreeComplete(questId);

    // 2. Define Conflict Groups (Mutually Exclusive Quests)
    const CONFLICT_GROUPS = [
        CHEMICAL_ALTERNATIVE_IDS,       // [Chemical 4, Big Customer, Out of Curiosity]
        ONE_LESS_LOOSE_END_ALTERNATIVE_IDS,  // [One Less_loose_end, A Healthy Alternative]
        COLLEAGUES_3_ALTERNATIVE, // [Colleagues - Part 3, The Huntsman Path - Sadist]
        SUPPLY_PLANS_ALTERNETIVE, // [Supply Plans, Kind of Sabotage]
    ];

    // 3. Handle Conflict Consequences
    // Check if the SPECIFIC quest we are completing is part of a choice group
    const conflictGroup = CONFLICT_GROUPS.find(group => group.includes(questId));

    if (conflictGroup) {
        conflictGroup.forEach(alternativeId => {
            // If this ID is a sibling (not the one we just clicked), mark it FAILED
            if (alternativeId !== questId) {
                updates.push({
                    id: alternativeId,
                    status: 'failed'
                });
            }
        });
    }

    // 4. Filter against History
    // Create a Set of ALL IDs currently in history (Complete OR Failed)
    // We do not want to update a quest that has already been processed.
    const historyIds = new Set(completedQuests.map(q => q.id));

    // Return only the new updates that aren't in history
    return updates.filter(updateItem => !historyIds.has(updateItem.id));
};

export const getNextQuestLists = (completedQuests, triggeringQuestId = null) => {

    // 1. Setup Lookup Sets
    const completedIds = new Set();
    const failedIds = new Set();
    const historyIds = new Set(); // Everything (Complete + Failed) to prevent duplicates

    // Sort your completedQuests into Success vs Failure
    completedQuests.forEach(item => {
        historyIds.add(item.id);
        if (item.status === 'complete') {
            completedIds.add(item.id);
        } else if (item.status === 'failed') {
            failedIds.add(item.id);
        }
    });

    // 2. Conflict Logic (Same as before to block alternatives)
    const CONFLICT_GROUPS = [
        CHEMICAL_ALTERNATIVE_IDS,
        ONE_LESS_LOOSE_END_ALTERNATIVE_IDS,
        COLLEAGUES_3_ALTERNATIVE,
        SUPPLY_PLANS_ALTERNETIVE,
    ];

    let relatedTriggerIds = [triggeringQuestId];
    const blockedIds = new Set();
    const factionName = getFaction();
    CONFLICT_GROUPS.forEach(group => {
        // A. General Blocking Logic
        const hasCompletedOne = group.find(id => completedIds.has(id));
        if (hasCompletedOne) {
            group.forEach(id => {
                if (id !== hasCompletedOne) blockedIds.add(id);
            });
        }

        // B. Smart Trigger Logic (The Fix)
        // If our triggeringQuestId is part of a group, we should also check
        // for quests that unlock specifically because the OTHERS failed.
        if (triggeringQuestId && group.includes(triggeringQuestId)) {
            // Add all siblings to the "trigger list" so we catch their failure-dependencies
            relatedTriggerIds = [...relatedTriggerIds, ...group];
        }
    });

    // 3. Filter the Quests
    const availableQuests = TASKS().filter(q => {
        // A. Basic filtering
        if (!["Any", factionName].includes(q.factionName)) return false; 
        if (historyIds.has(q.id)) return false;
        if (blockedIds.has(q.id)) return false;

        const requirements = q.taskRequirements || [];
        if (requirements.length === 0) return false;

        // B. *** Trigger Check ***
        if (triggeringQuestId) {
            // Does this quest require ANY of the IDs related to our trigger?
            // (Direct parent OR a sibling that failed because of the parent)
            const isRelated = requirements.some(req =>
                relatedTriggerIds.includes(req.task.id)
            );

            if (!isRelated) return false;
        }

        // C. THE FIX: Check Requirement Status
        // We check if the requirement is met based on whether the quest wants it 'complete' or 'failed'
        return requirements.every(req => {
            const reqId = req.task.id;

            // Standard API usually provides req.status = ['complete'] / ['failed'] / ['active']
            // If status is missing, we assume it requires 'complete'
            const requiredStatus = req.status || ['complete'];

            // complete / failed (For Trust Regain / No Offence)
            if (requiredStatus.includes('complete') && completedIds.has(reqId)) return true;
            if (requiredStatus.includes('failed') && failedIds.has(reqId)) return true;

            // 'active' = prerequisite เริ่มได้แล้ว (prereq ของมันเสร็จหมด) หรือทำเสร็จไปแล้ว
            // ให้สอดคล้องกับ QuestTree ที่ handle 'active' อยู่แล้ว
            if (requiredStatus.includes('active')) {
                if (completedIds.has(reqId)) return true;
                const pre = TASKS().find(t => t.id === reqId);
                const preReqs = pre?.taskRequirements || [];
                return preReqs.length > 0 && preReqs.every(r => completedIds.has(r.task.id));
            }

            return false;
        });
    });

    // If 'trigger' is complete, we force the 'unlocks' to appear (unless blocked).
    // 6. Apply Special "Force Add" Logic
    SPECIAL_UNLOCKS.forEach(special => {
        
        if ((typeof special.trigger === 'string') ? triggeringQuestId !== special.trigger : special.trigger.every(id => id !== triggeringQuestId)) return;
        if ((typeof special.trigger === 'string') ? completedIds.has(special.trigger) : special.trigger.every(id => completedIds.has(id))) {
            special.unlocks.forEach(unlockId => {
                // Check 1: Is it blocked? (e.g. you already did Chem 4, so Big Customer is blocked)
                if (blockedIds.has(unlockId)) return;

                // Check 2: Is it already in history?
                if (historyIds.has(unlockId)) return;

                // Check 3: Is it already in our list? (Prevent duplicates)
                if (availableQuests.find(q => q.id === unlockId)) return;

                // If safe, FIND the quest object and push it
                const questObj = TASKS().find(q => q.id === unlockId && ["Any", factionName].includes(q.factionName));
                if (questObj) {
                    availableQuests.push(questObj);
                }
            });
        }
    });

    return availableQuests;
};

export const getAllRequirements = (questId, visitedIds = new Set()) => {
    // 1. Cycle Prevention:
    // If we have already visited this quest ID, stop immediately to prevent infinite loops.
    if (visitedIds.has(questId)) {
        return visitedIds;
    }

    // 2. Add the current ID to our visited set
    visitedIds.add(questId);

    // 3. Find the quest object
    const quest = TASKS().find(q => q.id === questId);

    // 4. Base Case: If quest doesn't exist or has no requirements, return what we have
    if (!quest || !quest.taskRequirements || quest.taskRequirements.length === 0) {
        return visitedIds;
    }

    // 5. Recursion: Loop through requirements
    quest.taskRequirements.forEach(req => {
        // We simply pass the ID and the SAME set down the tree
        getAllRequirements(req.task.id, visitedIds);
    });

    return visitedIds;
};

/**
 * ถอดเควสออกจากรายการ "กำลังทำ" + ล้างความคืบหน้า objective ของมัน
 *
 * ใช้ตอนทำเครื่องหมายว่าเควสเสร็จ/พลาดจากหน้าอื่น (Kappa, AddQuest โหมด Completed)
 * หน้า Home ทำแบบนี้อยู่แล้วใน nextQuest แต่สองหน้านั้นเขียนแค่ eft_completed_quests
 * ทำให้เควสเดียวกันค้างเป็น "กำลังทำ" ในหน้า Home พร้อมกับเป็น "เสร็จแล้ว"
 */
/* อ่านแบบไม่โยน error — ข้อมูลที่ parse ไม่ได้ให้ถือว่าว่าง
   (โหมดส่วนตัว / เขียนค้างกลางคันตอน quota เต็ม / ส่วนขยายเบราว์เซอร์)
   ที่อื่นในแอปกันไว้หมดแล้ว (readStored, getTraderLevels, getFaction) */
const readRaw = (key, fallback) => {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
};

export const dropFromActive = (questIds) => {
    const ids = new Set(questIds);
    if (!ids.size) return;

    /* เดิมใช้ JSON.parse ตรง ๆ ตรงนี้ ถ้าข้อมูลเสียจะโยน error กลางคัน
       ซึ่งแย่กว่าที่คิด เพราะผู้เรียก (AddQuest / Kappa) เขียน eft_completed_quests
       ไปก่อนแล้ว -> เควสถูกบันทึกว่าเสร็จ แต่ไม่ถูกถอดจากรายการ "กำลังทำ"
       = ค้างเป็นทั้งสองสถานะพร้อมกัน ซึ่งเป็นอาการที่ฟังก์ชันนี้มีไว้ป้องกัน */
    const active = readRaw('eft_selected_quests', []);
    if (Array.isArray(active)) {
        const next = active.filter((q) => !ids.has(q?.id));
        if (next.length !== active.length) {
            localStorage.setItem('eft_selected_quests', JSON.stringify(next));
        }
    }

    const checks = readRaw('eft_objective_checklist', {});
    if (checks && typeof checks === 'object' && !Array.isArray(checks)) {
        let changed = false;
        Object.keys(checks).forEach((k) => {
            if (ids.has(k.split('|')[0])) { delete checks[k]; changed = true; }
        });
        if (changed) localStorage.setItem('eft_objective_checklist', JSON.stringify(checks));
    }
};

export const callbackStorageChange = (handleStorageChange) => {
    // Add listener
    window.addEventListener("storage", handleStorageChange);

    // Cleanup listener on unmount
    return () => {
        window.removeEventListener("storage", handleStorageChange);
    };
}
/**
 * แยกผลการค้นหาเควสตามสถานะ — รับไว้แล้ว / ทำจบไปแล้ว / ยังไม่ได้รับ
 *
 * ช่องค้นหาในหน้า Home เดิมมีไว้ "เพิ่มเควส" อย่างเดียว เลยตัดเควสที่รับไว้แล้วทิ้ง
 * พอรายการโตเป็นหลายสิบอันก็ตอบคำถามที่ถามบ่อยสุดไม่ได้ — "เควสนี้เรามีหรือยัง"
 *
 * @param term      คำค้น (ตัดช่องว่างแล้ว) — ว่าง = คืน null
 * @param quests    เควสทั้งหมดในเกม
 * @param active    เควสที่รับไว้ (วัตถุเควสเต็ม)
 * @param completed ประวัติที่ทำจบ [{ id, status }]
 */
export const splitSearchHits = (term, { quests = [], active = [], completed = [] } = {}) => {
    const q = String(term || '').trim().toLowerCase();
    if (!q) return null;

    const match = (t) => t?.name?.toLowerCase().includes(q);
    const activeIds = new Set(active.map(t => t.id));
    const doneIds = new Set(completed.map(t => t.id));

    // เควสที่รับไว้ไม่ต้องกรองฝ่าย — ถืออยู่ในมือแล้ว
    const inList = active.filter(match).slice(0, 8);
    const rest = quests.filter(t => match(t) && inFaction(t) && !activeIds.has(t.id));

    return {
        active: inList,
        done: rest.filter(t => doneIds.has(t.id)).slice(0, 6),
        add: rest.filter(t => !doneIds.has(t.id)).slice(0, 10),
    };
};

/* ชื่อแมพในข้อมูลมีตัวแปรย่อย (Ground Zero 21+ / Tutorial, The Lab (Dark))
   ที่เป็นแมพเดียวกับตัวหลัก — ตัวกรองแมพจึงต้องรับให้ครบ ไม่งั้นของที่ติดอยู่กับ
   ชื่อย่อยจะหายไปจากหน้าแมพ
   (home.jsx มี MAP_ALIAS ของตัวเองไว้ยุบ "ชิป" ในแถบตัวกรอง คนละงานกัน
    แต่ชุดชื่อต้องตรงกัน ถ้าเพิ่มที่นั่นแล้วอย่าลืมที่นี่) */
const MAP_VARIANTS = {
    'Ground Zero': ['Ground Zero 21+', 'Ground Zero Tutorial'],
    'The Lab': ['The Lab (Dark)'],
};
const sameMap = (name, want) => name === want || (MAP_VARIANTS[want] || []).includes(name);

/**
 * ของที่ต้องพกเข้าไปเพื่อ "วาง / มาร์ก / ใช้" ตามจุด — 93 จาก 503 เควส
 *
 * ไม่ได้อยู่ในช่อง Hand over (นั่นคือของที่ส่งให้เทรดเดอร์) และไม่ใช่กุญแจ
 * ถ้าไม่บอกไว้ก็รู้ตัวอีกทีตอนยืนอยู่หน้าจุดแล้วไม่มีของ — อาการเดียวกับกุญแจ
 * เลยโชว์ที่เดียวกัน
 *
 *   mark            -> markerItem  (MS2000 Marker 74 จุด มากที่สุด)
 *   plantItem       -> item + count (WI-FI Camera 42, Signal Jammer, ฯลฯ)
 *   plantQuestItem  -> questItem   (ของจาก objective ก่อนหน้า ต้องพกไปวางต่อ)
 *   useItem         -> useAny      (พลุสัญญาณ — ใช้ตัวไหนในลิสต์ก็ได้)
 *
 * @param mapName  จำกัดเฉพาะแมพนี้ (null = เอาทุกแมพ)
 * @returns [{ ...item, kind, count, mapName, anyOf }] ยุบของชิ้นซ้ำแล้ว
 */
export const PLACE_KIND = { mark: 'mark', plantItem: 'plant', plantQuestItem: 'plant', useItem: 'use' };

export const questPlantItems = (quest, mapName = null) => {
    const out = [];
    (quest?.objectives || []).forEach(o => {
        const kind = PLACE_KIND[o?.type];
        if (!kind) return;
        const onMaps = (o.maps || []).map(m => m?.name).filter(Boolean);
        // objective ที่ไม่ระบุแมพเลยให้ผ่านไว้ — ตัดทิ้งแล้วจะหายไปจากหน้าแมพทั้งที่เกี่ยวข้อง
        if (mapName && onMaps.length && !onMaps.some(n => sameMap(n, mapName))) return;

        const picks = o.markerItem ? [o.markerItem]
            : o.item ? [o.item]
                : o.questItem ? [o.questItem]
                    : (o.useAny || []);
        picks.forEach(it => it?.id && out.push({
            ...it, kind,
            count: o.count || 1,
            mapName: onMaps[0] || null,
            anyOf: (o.useAny || []).length > 1,   // พลุหลายสี เลือกสีไหนก็ได้
        }));
    });

    /* ของชิ้นเดียวกันโผล่หลาย objective -> รวมเป็นรายการเดียว แล้ว "บวก" จำนวน
       เพราะแต่ละจุดกินของของตัวเอง ไม่ได้ใช้ชิ้นเดิมซ้ำ:
         The Survivalist Path - Thrifty  บังเกอร์ 2 จุด x (Iskra 1 + น้ำ 1) -> ต้องเอาไป 2 กับ 2
         Thirsty - Delivery              "ถังแรก" + "ถังที่สอง"            -> ต้องเอาไป 2
         Chumming                        3 ชิ้นที่ Customs + 3 ที่ Woods    -> ต้องเอาไป 6
         เควสที่มาร์กหลายจุด              MS2000 กินดอกละจุด                -> ต้องเอาไปเท่าจำนวนจุด
       (เคยใช้ Math.max ซึ่งบอกน้อยกว่าจริงทุกเคสข้างบน)

       spots = จำนวนจุดที่ต้องไปทำ ใช้บอกว่าทำไมถึงต้องเอาไปหลายชิ้น
       ถ้ากรองตามแมพอยู่ ตัวเลขจะเหลือเฉพาะของแมพนั้นเอง */
    const byId = new Map();
    out.forEach(it => {
        const prev = byId.get(it.id);
        if (!prev) byId.set(it.id, { ...it, spots: 1 });
        else {
            prev.count += it.count;
            prev.spots += 1;
            if (prev.mapName !== it.mapName) prev.mapName = null;   // คนละแมพ -> ไม่ระบุ
        }
    });
    return [...byId.values()];
};

/**
 * กุญแจที่เควสต้องใช้ (data: quest.neededKeys = [{ map, keys: [...] }])
 * มี 56 จาก 503 เควสที่ต้องใช้กุญแจ
 *
 * @param mapName  จำกัดเฉพาะแมพนี้ (null = เอาทุกแมพ)
 *                 รับชื่อแมพตัวแปรย่อยด้วย (ดู MAP_VARIANTS)
 * @returns [{ ...key, mapName }] ยุบกุญแจดอกซ้ำแล้ว
 */
export const questKeys = (quest, mapName = null) => {
    const out = [];
    (quest?.neededKeys || []).forEach(group => {
        const onMap = group.map?.name;
        // เดิมเช็คเองแค่ `${mapName} 21+` ตัวเดียว -> ใช้ sameMap ร่วมกับ questPlantItems
        // จะได้ไม่หลุดกันเวลาเกมเพิ่มแมพรุ่นย่อยใหม่
        if (mapName && !sameMap(onMap, mapName)) return;
        (group.keys || []).forEach(k => k?.id && out.push({ ...k, mapName: onMap }));
    });
    // กุญแจดอกเดียวอาจอยู่หลายกลุ่ม (คนละ objective) -> เหลือดอกละรายการ
    return [...new Map(out.map(k => [k.id, k])).values()];
};

/* ค้นเควสจากชื่อ / ชื่อเทรดเดอร์ / ข้อความเป้าหมาย
   ไม่ค้นแค่ชื่อเควส เพราะหลายอันจำได้แค่ว่าต้องไปทำอะไร ("วางอะไรสักอย่างที่ปั๊ม")
   ไม่ได้จำว่าชื่อเควสคืออะไร · คำค้นว่าง = ผ่านทุกเควส (ไม่ใช่ไม่ผ่านสักอัน) */
export const questMatchesSearch = (quest, term) => {
    const t = (term || '').trim().toLowerCase();
    if (!t) return true;
    if (!quest) return false;
    return [quest.name, quest.trader?.name, ...(quest.objectives || []).map(o => o?.description)]
        .some(s => typeof s === 'string' && s.toLowerCase().includes(t));
};
