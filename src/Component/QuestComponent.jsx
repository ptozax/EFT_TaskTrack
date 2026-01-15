import React from 'react';
import quests from "../data/tasks";

const CHEMICAL_ALTERNATIVE_IDS = ['597a0f5686f774273b74f676', '597a160786f77477531d39d2', '597a171586f77405ba6887d3'];
const ONE_LESS_LOOSE_END_ALTERNATIVE_IDS = ['669fa38fad7f1eac2607ed46', '669fa3910c828825de06d69f'];

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
        ONE_LESS_LOOSE_END_ALTERNATIVE_IDS  // [One Less_loose_end, A Healthy Alternative]
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
        ONE_LESS_LOOSE_END_ALTERNATIVE_IDS
    ];

    let relatedTriggerIds = [triggeringQuestId];
    const blockedIds = new Set();
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
        }
    ];

    // 6. Apply Special "Force Add" Logic
    SPECIAL_UNLOCKS.forEach(special => {
        // If the Trigger Quest (e.g., Chem Part 3) is COMPLETED
        if (completedIds.has(special.trigger)) {

            special.unlocks.forEach(unlockId => {
                // Check 1: Is it blocked? (e.g. you already did Chem 4, so Big Customer is blocked)
                if (blockedIds.has(unlockId)) return;

                // Check 2: Is it already in history?
                if (historyIds.has(unlockId)) return;

                // Check 3: Is it already in our list? (Prevent duplicates)
                if (availableQuests.find(q => q.id === unlockId)) return;

                // If safe, FIND the quest object and push it
                const questObj = quests.find(q => q.id === unlockId);
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