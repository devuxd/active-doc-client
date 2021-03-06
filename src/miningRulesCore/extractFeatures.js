/*
This file contains methods for extracting features using the sets of predefined
features as in featureConfig.js
 */

import {featureTypes, mapFocusedElementToFeatures, new_features} from "./featureConfig";
import {
    returnNodeArray,
    runXPathMultipleNodes, runXPathMultipleNodesAndChildren,
    runXPathNoNode,
    runXPathSingleNode, runXPathSingleNodeAndChildren
} from "./xPathQueryExecutor";


/**
 * featureInfo is a Map > featureDescription: {featureId, featureIndex (from features in featureConfig), nodes, weight}
 * featureInfoReverse is a Map > featureId: featureDescription
 * featureMap is a Map > featureId: array of identifiers
 * featureMapReverse is a Map > identifier: array of featureIds
 *
 * featureInfoContainers: {featureInfo, featureInfoReverse, featureMap, featureMapReverse}
 * featureCategories: {classType, constructorType, functionType}
 * @typedef {{element: string, featureIds: number[]}} elementFeatures
 * @typedef {{featureInfoContainers: {
 * featureInfo: Object.<string, {featureIndex: string, featureId: number, nodes: undefined|string[], weight: number}>,
 * featureInfoReverse: Object.<number, string>,
 * featureMap: Object.<number, string[]>,
 * featureMapReverse: Object.<string, number[]>},
 * featureGroups: {
 * spec: Object.<string, {elementFeatures: elementFeatures[], rule: {}}>,
 * usage: Object.<string, {elementFeatures: elementFeatures[], rule: {}}>}
 * }} featureMetaDataType
 *
 * @typedef {{identifier: string, mapFocusedElementToFeaturesKey: string, filePath: string}} focusedElementDataType
 *
 * as featureMetaData
 * note: if changed, update minedRulesState.featureMetaData accordingly
 */
export const createFeatureMetaDataMap = () => {
    return {
        featureInfoContainers: {featureInfo: {}, featureInfoReverse: {}, featureMap: {}, featureMapReverse: {}},
        featureGroups: {spec: {}, usage: {}}
    }
};


/**
 * extract features for one xmlFile. It updates 5 main maps given as input parameters
 * @param xmlFile {{xml: string, filePath: string}}
 * @param projectPath {string} is used to simplify the identifiers
 * @param focusedElementData {focusedElementDataType}
 * @param featureMetaData {featureMetaDataType}
 */
export function mineFeaturesFromXmlFile(xmlFile, projectPath,
                                              focusedElementData,
                                              featureMetaData) {
    let key = focusedElementData.mapFocusedElementToFeaturesKey;
    let identifier = focusedElementData.identifier;
    let featuresToExtract = mapFocusedElementToFeatures[key];
    processFeatureSetSpec(xmlFile, projectPath, featureMetaData, key, featuresToExtract, identifier);


    // let xmlFileWithoutProjectPath = {filePath: xmlFile.filePath.replace(projectPath, ""), xml: xmlFile.xml};
    // let featureInfo = featureMetaData.featureInfoContainers.featureInfo,
    //     featureInfoReverse = featureMetaData.featureInfoContainers.featureInfoReverse,
    //     featureMap = featureMetaData.featureInfoContainers.featureMap;
    // let featureCategory = featureMetaData.featureInfoContainers.featureCategory;
    //
    // let classFeatureMap = featureMetaData.featureCategories.classFeatureMap,
    //     constructorFeatureMap = featureMetaData.featureCategories.constructorFeatureMap,
    //     functionFeatureMap = featureMetaData.featureCategories.functionFeatureMap;
    //
    // // first search for classes
    // let result = returnNodeIterator(xmlFileWithoutProjectPath.xml, nodesForFindingFeatures.classes);
    // if (result === -1) return; // invalid xml
    // let classNode = result.iterateNext();
    // let classCounterPerFile = 0;
    // // for each class
    // while (classNode) {
    //     let classIdentifier = xmlFileWithoutProjectPath.filePath + "_class_" + classCounterPerFile;
    //     let generalClassFeatureIds = extractGeneralClassFeature(classNode, featureInfo, featureInfoReverse);
    //     addToFeatureCategory(generalClassFeatureIds, "generalClassCategory", featureCategory);
    //     extractClassFeature(classNode, generalClassFeatureIds, classIdentifier,
    //         featureInfo, featureInfoReverse, featureMap, featureCategory, classFeatureMap);
    //     extractConstructorFeature(classNode, generalClassFeatureIds, classIdentifier,
    //         featureInfo, featureInfoReverse, featureMap, featureCategory, constructorFeatureMap);
    //     extractFunctionFeature(classNode, generalClassFeatureIds, classIdentifier,
    //         featureInfo, featureInfoReverse, featureMap, featureCategory, functionFeatureMap);
    //     classNode = result.iterateNext();
    //     classCounterPerFile++;
    // }
}

/**
 * extract the features of mapFocusedElementToFeatures[key].spec for xmlFile
 * @param xmlFile {{xml: string, filePath: string}}
 * @param projectPath {string} is used to simplify the identifiers
 * @param featureMetaData {featureMetaDataType}
 * @param key {string} of the mapFocusedElementToFeatures
 * @param featuresToExtract {{spec: [], usage: []}} selected from mapFocusedElementToFeatures
 * @param identifier {string} identifier of the focused element
 */
const processFeatureSetSpec = (xmlFile, projectPath, featureMetaData, key, featuresToExtract , identifier) => {
    let xmlFeatureIds = [];
    for (let i = 0; i < featuresToExtract.spec.length; i++) {
        let spec_item = featuresToExtract.spec[i];
        let container_xpath = (new_features[spec_item.container.node]).xpath;
        let containerNodes = returnNodeArray(xmlFile.xml, container_xpath);
        for (let j = 0; j < containerNodes.length; j++) {
            let containerFeatureIds = [];
            let containerNode = containerNodes[j];
            for (let featureId of spec_item.container.featureSet) {
                let container_node_xpath = (spec_item.container.featureQueryPrefix ? spec_item.container.featureQueryPrefix : "") +
                    (new_features[featureId].xpath);
                containerFeatureIds = containerFeatureIds.concat(extractFeatureFromNode(containerNode, featureId,
                    featureMetaData, container_node_xpath));
            }

            for (let k = 0; k < spec_item.content_groups.length; k++) {
                let group = spec_item.content_groups[k];
                let groupNodes = [containerNode];
                if (group.node) {
                    let group_xpath = new_features[group.node].xpath;
                    groupNodes = returnNodeArray(containerNode, group_xpath);
                }

                for (let l = 0; l < groupNodes.length; l++) {
                    let node = groupNodes[l];
                    let groupFeatureIds = []
                    for (let featureId of group.featureSet) {
                        let xpath_feature = (group.featureQueryPrefix ? group.featureQueryPrefix : "") +
                            (new_features[featureId].xpath);
                        let result = extractFeatureFromNode(node, featureId, featureMetaData, xpath_feature);
                        groupFeatureIds = groupFeatureIds.concat(result);
                    }

                    let groupId = group.id;//`${key}_spec_${i}_content_groups_${k}`;
                    if (!featureMetaData.featureGroups.spec[groupId])
                        featureMetaData.featureGroups.spec[groupId] = {elementFeatures: [], rule: {}};
                    let element = `${xmlFile.filePath.replace(projectPath, "")}_${spec_item.container.type}_${j}_${group.type}_${l}`;
                    let featureIds = containerFeatureIds.concat(groupFeatureIds);
                    featureMetaData.featureGroups.spec[groupId].elementFeatures.push({element, featureIds});
                    xmlFeatureIds = [...new Set(xmlFeatureIds.concat(featureIds))];
                }
            }

            let newUsageFeatureIds = processFeatureSetUsage(xmlFile, projectPath, featureMetaData, key,
                featuresToExtract, containerNode, identifier);
            xmlFeatureIds = [...new Set(xmlFeatureIds.concat(newUsageFeatureIds))];
        }
    }
    addFeatureIdsToMap(xmlFeatureIds, xmlFile.filePath.replace(projectPath, ""), featureMetaData);
}

/**
 * extract the features of mapFocusedElementToFeatures[key].usage for xmlFile
 * @param xmlFile {{xml: string, filePath: string}}
 * @param projectPath {string} is used to simplify the identifiers
 * @param featureMetaData {featureMetaDataType}
 * @param key {string} of the mapFocusedElementToFeatures
 * @param featuresToExtract {{spec: [], usage: []}} selected from mapFocusedElementToFeatures
 * @param parentNode {Node} the node on which the usage queries are executed
 * @param identifier {string} identifier of the focused element
 * @return {number[]} array of featureIds for the xmlFile
 */
const processFeatureSetUsage = (xmlFile, projectPath, featureMetaData,
                                key, featuresToExtract, parentNode, identifier) => {
    let newUsageFeatureIds = [];
    for (let i = 0; i < featuresToExtract.usage.length; i++) {
        let usage_item = featuresToExtract.usage[i];
        let container_xpath = (new_features[usage_item.container.node]).xpath
            .replace(new RegExp("<IDENTIFIER>", "g"), identifier);
        let containerNodes = returnNodeArray(parentNode, container_xpath);

    for (let j = 0; j < containerNodes.length; j++) {
            let containerFeatureIds = [];
            let containerNode = containerNodes[j];
            for (let featureId of usage_item.container.featureSet) {
                let container_node_xpath = (usage_item.container.featureQueryPrefix ? usage_item.container.featureQueryPrefix : "") +
                    (new_features[featureId].xpath).replace(new RegExp("<IDENTIFIER>", "g"), identifier);
                containerFeatureIds = containerFeatureIds
                    .concat(extractFeatureFromNode(containerNode, featureId, featureMetaData, container_node_xpath));
            }

            for (let k = 0; k < usage_item.content_groups.length; k++) {
                let group = usage_item.content_groups[k];
                let groupNodes = [containerNode];
                if (group.node) {
                    let group_xpath = (new_features[group.node].xpath)
                        .replace(new RegExp("<IDENTIFIER>", "g"), identifier);
                    groupNodes = returnNodeArray(containerNode, group_xpath);
                }
                for (let l = 0; l < groupNodes.length; l++) {
                    let node = groupNodes[l];
                    let groupFeatureIds = []
                    for (let featureId of group.featureSet) {
                        let xpath_feature = (group.featureQueryPrefix ? group.featureQueryPrefix : "") +
                            (new_features[featureId].xpath).replace(new RegExp("<IDENTIFIER>", "g"), identifier);
                        let result = extractFeatureFromNode(node, featureId, featureMetaData, xpath_feature);
                        groupFeatureIds = groupFeatureIds.concat(result);
                    }

                    let groupId = group.id;//`${key}_usage_${i}_content_groups_${k}`;
                    if (!featureMetaData.featureGroups.usage[groupId])
                        featureMetaData.featureGroups.usage[groupId] = {elementFeatures: [], rule: {}};
                    let element = `${xmlFile.filePath.replace(projectPath, "")}_${usage_item.container.type}_${j}_${group.type}_${l}`;
                    let featureIds = containerFeatureIds.concat(groupFeatureIds);
                    featureMetaData.featureGroups.usage[groupId].elementFeatures.push({element, featureIds});
                    newUsageFeatureIds = [...new Set(newUsageFeatureIds.concat(featureIds))];
                }
            }
        }
    }
    return newUsageFeatureIds;
}


/**
 * run the xpath query of a feature on the given node
 * @param mainNode {Node} the node on which the query is executed
 * @param featureIndex {string} a key from new_features
 * @param featureMetaData {featureMetaDataType}
 * @param xpath {string}
 * @return {*[]} array of featureIds
 */
const extractFeatureFromNode = (mainNode, featureIndex, featureMetaData, xpath) => {
    let featureIds = [], result = [];
    let featureInfo = featureMetaData.featureInfoContainers.featureInfo,
        featureInfoReverse = featureMetaData.featureInfoContainers.featureInfoReverse;
    switch (new_features[featureIndex].type) {
        case featureTypes.no_node:
            result = extractNoNodeFeature(mainNode, featureIndex, featureInfo, featureInfoReverse, xpath);
            featureIds = featureIds.concat(result);
            break;
        case featureTypes.single_node_text:
            result = extractSingleTextFeature(mainNode, featureIndex, featureInfo, featureInfoReverse, xpath);
            featureIds = featureIds.concat(result);
            break;
        case featureTypes.single_node_and_children_text:
            result = extractSingleTextFeature(mainNode, featureIndex, featureInfo, featureInfoReverse, xpath, true);
            featureIds = featureIds.concat(result);
            break;
        case featureTypes.multiple_nodes_texts:
            result = extractMultipleTextsFeature(mainNode, featureIndex, featureInfo, featureInfoReverse, xpath);
            featureIds = featureIds.concat(result);
            break;
        case featureTypes.multiple_nodes_and_children_texts:
            result = extractMultipleTextsFeature(mainNode, featureIndex, featureInfo, featureInfoReverse, xpath, true);
            featureIds = featureIds.concat(result);
            break;
        default:
            break;
    }
    return featureIds;
}


//
// /**
//  * This method only generate features and add it to featureInfo
//  * @param classNode the Node for the class
//  * @param featureInfo general Map
//  * @param featureInfoReverse is a Map > featureId: featureDescription
//  * @return {*[]} array of ids (numbers) of found features for the given class
//  */
// const extractGeneralClassFeature = (classNode, featureInfo, featureInfoReverse) => {
//     let result = processFeatures(generalClassFeatureIndex, classNode, featureInfo, featureInfoReverse)
//     return [...new Set(result)];
// }
//
// /**
//  * This method generate features for a class and update both featureInfo and classFeatureMap
//  * It adds both generalClass (given as a parameter) and class features (computed in the method) to classFeatureMap
//  * @param classNode the Node for the class
//  * @param generalClassFeatureIds is added to the list of features for a class
//  * @param classIdentifier is used as a key for classFeatureMap
//  * @param featureInfo general Map > featureDescription: {featureIndex, featureId, nodes: []}
//  * @param featureInfoReverse is a Map > featureId: featureDescription
//  * @param featureMap general Map for tracking usages of each feature > featureId: array of identifiers
//  * @param featureCategory a map that lists feature IDs per each category of features
//  * @param classFeatureMap general Map > classIdentifier: array of featureIds
//  */
// const extractClassFeature = (classNode, generalClassFeatureIds, classIdentifier,
//                              featureInfo, featureInfoReverse, featureMap, featureCategory, classFeatureMap) => {
//     concatToMap(classIdentifier, generalClassFeatureIds, classFeatureMap);
//     let featureIds = processFeatures(classFeatureIndex, classNode, featureInfo, featureInfoReverse);
//     concatToMap(classIdentifier, featureIds, classFeatureMap);
//     addValueToKeysInMap(featureIds, classIdentifier, featureMap);
//     addToFeatureCategory(featureIds, "classCategory", featureCategory);
// }
//
// /**
//  * This method generate features for a constructor and update both featureInfo and constructorFeatureMap
//  * It adds both generalClass (given as a parameter) and constructor features (computed in the method)
//  * to constructorFeatureMap
//  * @param classNode the Node for the parent class
//  * @param generalClassFeatureIds is added to the list of features for a parent class
//  * @param classIdentifier is used as a key for classFeatureMap
//  * @param featureInfo general Map > featureDescription: {featureIndex, featureId, nodes: []}
//  * @param featureInfoReverse is a Map > featureId: featureDescription
//  * @param featureMap general Map for tracking usages of each feature > featureId: array of identifiers
//  * @param featureCategory a map that lists feature IDs per each category of features
//  * @param constructorFeatureMap general Map > constructorIdentifier: array of featureIds
//  */
// const extractConstructorFeature = (classNode, generalClassFeatureIds, classIdentifier,
//                                    featureInfo, featureInfoReverse, featureMap, featureCategory, constructorFeatureMap) => {
//     let nodes = returnNodeIterator(classNode, nodesForFindingFeatures.constructors);
//
//     let constructorNode = nodes.iterateNext()
//     if (constructorNode) {
//         let constructorCounterPerClass = 0;
//         // for each constructor
//         while (constructorNode) {
//             let constructorIdentifier = classIdentifier + "_constructor_" + constructorCounterPerClass;
//             concatToMap(constructorIdentifier, generalClassFeatureIds, constructorFeatureMap);
//             let featureIds = processFeatures(constructorFeatureIndex, constructorNode, featureInfo, featureInfoReverse);
//             concatToMap(constructorIdentifier, featureIds, constructorFeatureMap);
//             addValueToKeysInMap(featureIds, constructorIdentifier, featureMap);
//             addToFeatureCategory(featureIds, "constructorCategory", featureCategory);
//             constructorNode = nodes.iterateNext();
//             constructorCounterPerClass++;
//         }
//     }
// }
//
// /**
//  * This method generate features for a function and update both featureInfo and functionFeatureMap
//  * It adds both generalClass (given as a parameter) and function features (computed in the method)
//  * to functionFeatureMap
//  * @param classNode the Node for the parent class
//  * @param generalClassFeatureIds is added to the list of features for a parent class
//  * @param classIdentifier is used as a key for classFeatureMap
//  * @param featureInfo general Map > featureDescription: {featureIndex, featureId, nodes: []}
//  * @param featureInfoReverse is a Map > featureId: featureDescription
//  * @param featureMap general Map for tracking usages of each feature > featureId: array of identifiers
//  * @param featureCategory a map that lists feature IDs per each category of features
//  * @param functionFeatureMap general Map > functionIdentifier: array of featureIds
//  */
// const extractFunctionFeature = (classNode, generalClassFeatureIds, classIdentifier,
//                                 featureInfo, featureInfoReverse, featureMap, featureCategory, functionFeatureMap) => {
//     let nodes = returnNodeIterator(classNode, nodesForFindingFeatures.functions);
//
//     let functionNode = nodes.iterateNext()
//     if (functionNode) {
//         let functionCounterPerClass = 0;
//         // for each function
//         while (functionNode) {
//             let functionIdentifier = classIdentifier + "_function_" + functionCounterPerClass;
//             concatToMap(functionIdentifier, generalClassFeatureIds, functionFeatureMap);
//             let featureIds = processFeatures(functionFeatureIndex, functionNode, featureInfo, featureInfoReverse);
//             concatToMap(functionIdentifier, featureIds, functionFeatureMap);
//             addValueToKeysInMap(featureIds, functionIdentifier, featureMap);
//             addToFeatureCategory(featureIds, "functionCategory", featureCategory);
//             functionNode = nodes.iterateNext();
//             functionCounterPerClass++;
//         }
//     }
// }
//
// /**
//  * general purpose method for processing different types of features.
//  * @param featureIndices the constant property from _featureConfig.js file
//  * @param node the parent node
//  * @param featureInfo the general Map that is being updated
//  * @param featureInfoReverse is a Map > featureId: featureDescription
//  * @return {*[]} the array of ids of newly generated features
//  */
// const processFeatures = (featureIndices, node, featureInfo, featureInfoReverse) => {
//     let featureIds = [], result = [];
//     for (let i = 0; i < featureIndices.length; i++) {
//         switch (features[featureIndices[i]].type) {
//             case featureTypes.no_node:
//                 result = extractNoNodeFeature(node, featureIndices[i], featureInfo, featureInfoReverse);
//                 featureIds = featureIds.concat(result);
//                 break;
//             case featureTypes.single_node_text:
//             case featureTypes.single_node_and_children_text:
//                 result = extractSingleTextFeature(node, featureIndices[i], featureInfo, featureInfoReverse);
//                 featureIds = featureIds.concat(result);
//                 break;
//             case featureTypes.multiple_nodes_texts:
//             case featureTypes.multiple_nodes_and_children_texts:
//                 result = extractMultipleTextsFeature(node, featureIndices[i], featureInfo, featureInfoReverse);
//                 featureIds = featureIds.concat(result);
//                 break;
//             default:
//                 break;
//         }
//     }
//     return featureIds;
// }
//

/**
 * extract features when no node is queried. E.g., class with no constructors
 * @param mainNode {Node} the node on which the query is executed
 * @param featureIndex {string} a key from new_features
 * @param featureInfo {{}} feature_desc: {featureIndex, featureId, nodes, weight}
 * @param featureInfoReverse {{}} featureId: feature_desc
 * @param xpath {string}
 * @return {number[]} array of the new featureId
 */
const extractNoNodeFeature = (mainNode, featureIndex, featureInfo, featureInfoReverse, xpath) => {
    let result = runXPathNoNode(mainNode, xpath);
    if (!result) return [];
    let featureId = featureInfo.hasOwnProperty(new_features[featureIndex].description)
        ? featureInfo[new_features[featureIndex].description].featureId
        : Object.keys(featureInfo).length;
    featureInfo[new_features[featureIndex].description] = Object.assign({}, {
        featureIndex: featureIndex,
        featureId,
        weight: new_features[featureIndex].weight
    });
    featureInfoReverse[featureId] = new_features[featureIndex].description;
    return [featureId];
}

/**
 * extract features when only one node (as text()) is queried. E.g., class with visibility xx
 * @param mainNode {Node} the node on which the query is executed
 * @param featureIndex {string} a key from new_features
 * @param featureInfo {Object.<string, {featureIndex: string, featureId:number, nodes: undefined|string[], weight: number} >} feature_desc
 * @param featureInfoReverse {Object.<number, string>} featureId: feature_desc
 * @param xpath {string}
 * @param includeChildren {boolean} used to extract children of the xpath query node
 * @return {*[]} returns the array of new featureIds
 */
const extractSingleTextFeature = (mainNode, featureIndex, featureInfo,
                                  featureInfoReverse, xpath, includeChildren = false) => {
    let ids = [];
    let result = includeChildren ? runXPathSingleNodeAndChildren(mainNode, xpath)
        : runXPathSingleNode(mainNode, xpath);
    if (result.length === 0) return [];
    for (let j = 0; j < result.length; j++) {
        let description = new_features[featureIndex].description.replace("<TEMP_0>", result[j].replace(/"/g, "'"));
        let featureId = featureInfo.hasOwnProperty(description) ? featureInfo[description].featureId
            : Object.keys(featureInfo).length;
        featureInfo[description] =
            Object.assign({}, {
                featureIndex: featureIndex, featureId, nodes: [result[j]],
                weight: new_features[featureIndex].weight
            });
        featureInfoReverse[featureId] = description;
        ids.push(featureId);
    }
    return ids;
}

/**
 * extract features when several nodes (all as text()) are queried. E.g., parameter with type xx and name yy
 * @param mainNode {Node} the node on which the query is executed
 * @param featureIndex {string} a key from new_features
 * @param featureInfo {Object.<string, {featureIndex: string, featureId:number, nodes: undefined|string[], weight: number} >} feature_desc
 * @param featureInfoReverse {Object.<number, string>} featureId: feature_desc
 * @param xpath {string}
 * @param includeChildren {boolean} used to extract children of the xpath query node
 * @return {*[]} returns the array of new featureIds
 */
const extractMultipleTextsFeature = (mainNode, featureIndex, featureInfo,
                                     featureInfoReverse, xpath, includeChildren = false) => {
    let ids = [];
    let result = includeChildren ? runXPathMultipleNodesAndChildren(mainNode, xpath, new_features[featureIndex].nodes) :
        runXPathMultipleNodes(mainNode, xpath, new_features[featureIndex].nodes);
    if (result.length === 0) return [];
    for (let i = 0; i < result.length; i++) {
        let description = new_features[featureIndex].description;
        for (let j = 0; j < result[i].length; j++) {
            description = description.replace(`<TEMP_${j}>`, result[i][j].replace(/"/g, "'"));
        }
        let featureId = featureInfo.hasOwnProperty(description) ? featureInfo[description].featureId
            : Object.keys(featureInfo).length;
        featureInfo[description] = Object.assign({}, {
            featureIndex: featureIndex,
            featureId,
            nodes: result[i],
            weight: new_features[featureIndex].weight
        });
        featureInfoReverse[featureId] = description;
        ids.push(featureId);
    }
    return ids;
}

//
// /**
//  * concat the newValues to targetMap[key]
//  * @param key
//  * @param newArrayOfValues array of numbers
//  * @param targetMap
//  */
// const concatToMap = (key, newArrayOfValues, targetMap) => {
//     if (targetMap.hasOwnProperty(key)) {
//         let entry = targetMap[key];
//         entry = entry.concat(newArrayOfValues);
//         entry = [...new Set(entry)]
//         targetMap[key] = entry;
//     } else {
//         targetMap[key] = newArrayOfValues;
//     }
// }

// /**
//  * add a new value to all of given keys
//  * @param arrayOfKeys
//  * @param newValue
//  * @param targetMap
//  */
// const addValueToKeysInMap = (arrayOfKeys, newValue, targetMap) => {
//     for (let i = 0; i < arrayOfKeys.length; i++) {
//         concatToMap(arrayOfKeys[i], [newValue], targetMap);
//     }
// }
//
// /**
//  * add the set of feature IDs to featureMetaData.featureInfoContainers.featureCategory[category]
//  * @param featureIds
//  * @param category
//  * @param featureCategory
//  */
// const addToFeatureCategory = (featureIds, category, featureCategory) => {
//     if (!featureCategory[category])
//         featureCategory[category] = featureIds;
//     else
//         featureCategory[category] = [...new Set(featureCategory[category].concat(featureIds))];
// }


/**
 * add featureIds to featureMetaData.featureInfoContainers.featureMap and featureMapReverse
 * @param featureIds {number[]}
 * @param identifier {string} the key used in the maps (right now it is filePath.replace(projectPath, "")
 * @param featureMetaData {featureMetaDataType}
 * */
const addFeatureIdsToMap = (featureIds, identifier, featureMetaData) => {
    featureMetaData.featureInfoContainers.featureMapReverse[identifier] = featureIds;
    for (let featureId of featureIds) {
        if (!featureMetaData.featureInfoContainers.featureMap[featureId])
            featureMetaData.featureInfoContainers.featureMap[featureId] = [];
        featureMetaData.featureInfoContainers.featureMap[featureId].push(identifier);
    }
}