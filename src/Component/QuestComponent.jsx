import React from 'react';
import quests from "../data/tasks";

const CHEMICAL_ALTERNATIVE_IDS = ['597a0f5686f774273b74f676', '597a160786f77477531d39d2', '597a171586f77405ba6887d3'];
const ONE_LESS_LOOSE_END_ALTERNATIVE_IDS = ['669fa38fad7f1eac2607ed46', '669fa3910c828825de06d69f'];
const COLLEAGUES_3_ALTERNATIVE = ['5edab4b1218d181e29451435', '5edac34d0bb72a50635c2bfa']

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
const SUPPLY_PLANS_ACTIVE = {
    trigger: '5969f9e986f7741dde183a50',
    unlocks: ['596a0e1686f7741ddf17dbee', '596a101f86f7741ddb481582']
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

export const getStartQuests = () => {
    return ["First in Line", "Shooting Cans", "Burning Rubber", "Saving the Mole"]
}

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
    ];

    let relatedTriggerIds = [triggeringQuestId];
    const blockedIds = new Set();
    const factionName = JSON.parse(localStorage.getItem('eft_faction_name')) || 'BEAR';
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
    const availableQuests = quests.filter(q => {
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

            // Standard API usually provides req.status = ['complete'] or ['failed']
            // If status is missing, we assume it requires 'complete'
            const requiredStatus = req.status || ['complete'];

            // Check if we match the 'complete' requirement
            const isCompleted = completedIds.has(reqId) && requiredStatus.includes('complete');

            // Check if we match the 'failed' requirement (For Trust Regain / No Offence)
            const isFailed = failedIds.has(reqId) && requiredStatus.includes('failed');

            // Pass if EITHER condition is met
            return isCompleted || isFailed;
        });
    });

    // If 'trigger' is complete, we force the 'unlocks' to appear (unless blocked).
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
        WET_JOB_5_ACTIVE, TROPHY_ACTIVE, ICE_CREAM_CONES_ACTIVE, PVP, SUPPLY_PLANS_ACTIVE,
        REVISION_RESERVE_ACTIVE, SENSORY_ANALYSIS_1_ACTIVE, DISEASE_HISTORY_ACTIVE,
        HEALTH_CARE_4_ACTIVE, HLEPING_HAND_ACTIVE, INEVITABLE_RESPONSE_ACTIVE,
        MINIBUS_ACTIVE, FARMING_3_ACTIVE, THE_GOOD_TIMES_1_ACTIVE, PUNISHER_5_ACTIVE,
        WOODS_KEEPER_ACTIVE, DANDIES_ACTIVE, HOOBY_CLUB_ACTIVE,
    ];

    // 6. Apply Special "Force Add" Logic
    SPECIAL_UNLOCKS.forEach(special => {
        
        if ((typeof special.trigger === 'string') ? triggeringQuestId !== special.trigger : special.trigger.every(id => id !== triggeringQuestId)) return;
        if ((typeof special.trigger === 'string') ? completedIds.has(special.trigger) : special.trigger.every(id => completedIds.has(id))) {
            console.log(special);
            special.unlocks.forEach(unlockId => {
                // Check 1: Is it blocked? (e.g. you already did Chem 4, so Big Customer is blocked)
                if (blockedIds.has(unlockId)) return;

                // Check 2: Is it already in history?
                if (historyIds.has(unlockId)) return;

                // Check 3: Is it already in our list? (Prevent duplicates)
                if (availableQuests.find(q => q.id === unlockId)) return;

                // If safe, FIND the quest object and push it
                const questObj = quests.find(q => q.id === unlockId && ["Any", factionName].includes(q.factionName));
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
    const quest = quests.find(q => q.id === questId);

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

export const callbackStorageChange = (handleStorageChange) => {
    // Add listener
    window.addEventListener("storage", handleStorageChange);

    // Cleanup listener on unmount
    return () => {
        window.removeEventListener("storage", handleStorageChange);
    };
}