import React from 'react';
import quests from "../data/tasks";

export const getStartQuests = () => {
    return ["First in Line", "Shooting Cans", "Burning Rubber", "Saving the Mole"]
}

export const getPreviousQuestsList = (questId, completedQuests) => {
    const currentId = questId;
    const previousQuestsSet = getAllRequirements(currentId);

    // Convert Set back to Array if needed
    const previousQuests = Array.from(previousQuestsSet);

    // Filter out quests that are already completed
    return previousQuests.filter(id => !completedQuests.includes(id));
};

export const getNextQuestLists = (completedQuests) => {
    // 1. Find quests where at least one requirement is met in completedQuests
    const availableQuests = quests.filter(q =>
        q.taskRequirements.length > 0 && // Must have at least 1 requirement
        q.taskRequirements.every(t => completedQuests.includes(t.task.id))
    );

    // 2. Filter out quests that are already completed
    return availableQuests.filter(q => !completedQuests.includes(q.id));
}

export const getAllRequirements = (startQuestId, collectedIds = new Set()) => {
    // 1. Find the current quest object safely
    collectedIds.add(startQuestId);
    const quest = quests.find(q => q.id === startQuestId);

    // 2. Base Case: If quest doesn't exist or has no requirements, stop
    if (!quest || !quest.taskRequirements || quest.taskRequirements.length === 0) {
        return collectedIds;
    }

    // 3. Loop through requirements
    quest.taskRequirements.forEach(req => {
        // Prevent infinite loops if data is bad (circular dependency)
        if (!collectedIds.has(req.task.id)) {

            // Add this requirement to our list
            collectedIds.add(req.task.id);

            // 4. RECURSION: Go find requirements for THIS requirement
            getAllRequirements(req.task.id, collectedIds);
        }
    });

    return collectedIds;
};