/*
 * This code is written by Genni Mansi.
 * Edited by Sahar Mehrpour
 * Nov 2019
 */

import {
    addClassAnnotations, addClsFunctions, addConstructors, addImplementations,
    addMemberVars, findClassAnnotations, findClsFunctions, findConstructors,
    findImplements, findMemberVars, addParentChildRelationsExtra
} from "./sci_functions";

import et from "elementtree";

export const makePairsList = (classRoot, childParent, classLocations) => {

    let childName = "DOES NOT EXIST";
    let parentName = "DOES NOT EXIST";

    let cls = classRoot.findall(".//class");

    for (let i = 0; i < cls.length; i++) {

        // Figure out what the child class's name is
        let chName = cls[i].find("name");
        if (chName == null) {
            continue;
        }

        if (chName.text == null) {
            childName = (chName.find("name")).text
        } else {
            childName = chName.text;

            if (childName !== "") {
                classLocations[childName] = classRoot.find("[@filename]")
                    .get("filename");
            }
        }
        // If we can't find a name, then we go on to the next class in
        // the srcML file
        if (childName === "") {
            continue;
        }

        let ext = cls[i].find(".//super/extends");
        if (ext != null) {

            let ptName = ext.find("name");

            if (ptName.text === "") {
                parentName = (ptName.find("name")).text;
            } else {
                parentName = ptName.text;
            }

            // If we can't find the parent name, then we go ahead append
            // and skip past this case
            if (parentName == null) {
                continue;
            }

            if (!childParent.has(parentName)) {
                childParent.set(parentName, [childName]);
            } else {
                childParent.get(parentName).push(childName);
            }
        }
    }
};


export const addChildren = (parent, childParent, groupID, currDepth, groupList) => {

    if (currDepth <= 0 || !childParent.has(parent)) {
        return parent;
    }

    for (let i = 0; i < childParent.get(parent).length; i++) {
        let nextChild = addChildren((childParent.get(parent))[i], childParent,
            groupID, currDepth - 1, groupList);
        if (!groupList.has(groupID)) {
            groupList.set(groupID, [nextChild]);
        } else {
            groupList.get(groupID).push(nextChild);
        }
    }

    return parent;
};

// Note: the xPath queries provided in customQueries double as the
// attribute description and command
export const findCustomRelations = (id_start, customQueries, attributeList,
                                    queryMap, queryMap_special) => {

    for (let i = 0; i < customQueries.length; i++) {

        if (!attributeList.has(customQueries[i].featureDescription)) {

            attributeList.set(customQueries[i].featureDescription, id_start.id);
            queryMap.set(customQueries[i].featureXpath, id_start.id);
            queryMap_special.set(customQueries[i].featureXpath, id_start.id);

            id_start.id += 1;
        }
    }
};


export const addCustomRelations = (allAttributes, customQueries, classGroupings,
                                   analysisFileName, classLocations,
                                   parentInfo, /*fileAnalysisMap,*/ dataMap, xmlFiles) => {

    let parentClass = classGroupings[classGroupings.length - 1];
    let classTree;

    // Used to keep track of the children classes about which we've already
    // collected data
    let classesVisited = [];

    // Used to keep track of all the files we have accessed
    let listOfFiles = [];
    let index = 0;

    for (let i = 0; i < classGroupings.length; i++) {

        let f = classLocations[classGroupings[i]];

        if (f !== undefined) {
            f = f.split("\\")[(f.split("\\")).length - 1];
            f = f.split(".")[f.split(".").length - 2] + ".java";

            // let data = fs.readFileSync(f).toString();
            // classTree = et.parse(data);

            let filtered = xmlFiles.filter(d => d["filePath"].endsWith(f));
            if (filtered.length > 0)
                classTree = et.parse(filtered[0]["xml"]);
            if (filtered.length === 0) {
                console.log("file not found: ", f);
                continue;
            }
        } else {
            continue;
        }

        let subCL = classTree.findall(".//class");
        let childName;

        for (let j = 0; j < subCL.length; j++) {

            // Figure out what the child class's name is
            let chName = subCL[j].find("name");

            if (chName == null) {
                continue;
            }

            if (chName.text == null) {
                childName = (chName.find("name")).text
            } else {
                childName = chName.text;
            }
            // If we can't find a name, then we go on to the next class in
            // the srcML file
            if (childName === "") {
                continue;
            }

            // Each xml file might contain multiple classes, so just because a class
            // is in the file, doesn't mean that it is the one that we want, so
            // we need to check that the filename is in classGroupings
            if (classGroupings.includes(childName) && !classesVisited.includes(childName)) {
                classesVisited.push(childName);

                // Get the list of attributes for this class
                let fileN = analysisFileName + "_subClassOf_" + parentClass + ".txt";
                let entry = (dataMap.get(fileN));

                // Go through each of the customQueries. If the customQuery is present
                // in this class, then add its attribute id to the list of attributes
                // for the class
                for (let k = 0; k < customQueries.length; k++) {

                    let query = subCL[j].findall(customQueries[k].featureXpath);

                    // If we found this customQuery, then we add it to the list of
                    // attribute for this class
                    if (query != null && index < entry.length) {

                        if (allAttributes.has(customQueries[k].featureDescription) &&
                            !entry[index].includes(allAttributes
                                .get(customQueries[k].featureDescription))) {

                            entry[index].push(allAttributes
                                .get(customQueries[k].featureDescription));
                            dataMap.set(fileN, entry);
                            entry = dataMap.get(fileN);

                            if (!listOfFiles.includes(f)) {
                                listOfFiles.push(f);
                            }

                        }
                    }
                }
                // Increment index into set of entries for this database
                index++;
            }

        }
    }

    // // Record that this file was used to contribute to this database
    // let fileN = analysisFileName + "_subClassOf_" + parentClass + ".txt";
    // let newStuff = listOfFiles.join("\n");
    //
    // fileAnalysisMap.set(fileN, newStuff);
};


export const findParentChildRelations = (id_start, classGroupings,
                                         attributeList, classLocations,
                                         parentInfo, queryMap, xmlFiles) => {

    let parentClass = classGroupings[classGroupings.length - 1];
    let subCLfncs = [];
    let classTree;
    // Get all the children classes' info

    // This array is to keep track of what functions are overridden in
    // the child class; we assume they are overridden, but once we
    // find a class that doesn't override a parent function we set that
    // element to False

    for (let i = 0; i < classGroupings.length; i++) {

        let f = classLocations[classGroupings[i]];

        if (f !== undefined) {
            f = f.split("\\")[(f.split("\\")).length - 1];
            f = f.split(".")[f.split(".").length - 2] + ".java";
            let filtered = xmlFiles.filter(d => d["filePath"].endsWith(f));
            if (filtered.length > 0)
                classTree = et.parse(filtered[0]["xml"]);
            if (filtered.length === 0) {
                console.log("file not found: ", f);
                continue;
            }
        } else {
            continue;
        }

        let subCL = classTree.findall(".//class");
        let childName;
        for (let j = 0; j < subCL.length; j++) {
            // Figure out what the child class's name is
            let chName = subCL[j].find("name");

            if (chName == null) {
                continue;
            }

            if (chName.text == null) {
                childName = (chName.find("name")).text
            } else {
                childName = chName.text;
            }
            // If we can't find a name, then we go on to the next class in
            // the srcML file
            if (childName === "") {
                continue;
            }

            // Each xml file might contain multiple classes, so just because
            // setInterval(function () {
            // is in the file, doesn't mean that it is the one that we want, so
            // we need to check that the filename is in classGroupings
            if (classGroupings.includes(childName)) {

                if (parentInfo.get(parentClass) !== undefined) {

                    // This will contain a list of functions that are present in both
                    // the parent class and the child class.
                    let matchingFunctions;
                    if (parentClass !== childName) {

                        // First get a list of all the child functions
                        let fncs = subCL[j].findall("block/function");

                        for (let k = 0; k < fncs.length; k++) {
                            subCLfncs.push((fncs[k].find("name")).text);
                        }

                        subCLfncs.sort();

                        // Then see what functions are in common between the two lists;
                        // If there are matching functions, then matchingFunctions will
                        // contain their names.
                        matchingFunctions = subCLfncs.filter(element =>
                            (parentInfo.get(parentClass).functions).includes(element));

                        subCLfncs.length = 0;

                    }
                    // Come here and output attribute about parent functions matching
                    // Clear out matching functions here as well
                    if (matchingFunctions != null) {
                        for (let m = 0; m < matchingFunctions.length; m++) {

                            let name = "class overrides function of name \""
                                + matchingFunctions[m]
                                + "\" in parent class";

                            // Check if this attribute has been seen globally
                            if (!attributeList.has(name)) {

                                let command = "//src:function[src:annotation/src:name/"
                                    + "text()=\"Override\""
                                    + "and src:name/text()=\"" + matchingFunctions[m]
                                    + "\"]";

                                attributeList.set(name, id_start.id);
                                queryMap.set(command, id_start.id);

                                id_start.id += 1;
                            }
                            name = "";

                        }
                        matchingFunctions.length = 0;
                        matchingFunctions = [];
                    }
                }

                // Finds attributes having to do with the annotations above the class
                findClassAnnotations(subCL[j], attributeList, id_start, queryMap);

                // Finds attributes having to do with the constructors in the
                // class
                findConstructors(subCL[j], attributeList, id_start, queryMap);

                // Finds attributes having to do with member variables
                findMemberVars(subCL[j], attributeList, id_start, queryMap);

                // Finds attributes having to do with class implementations
                findImplements(subCL[j], attributeList, id_start, queryMap);

                // Finds attributes about class visibility and class functions
                findClsFunctions(subCL[j], attributeList, id_start, queryMap);

            }
        }
    }

};


export const addParentChildRelations = (allAttributes, classGroupings,
                                        analysisFileName, classLocations,
                                        parentInfo, fileAnalysisMap, dataMap,
                                        xmlFiles, searchTerms) => {

    let parentClass = classGroupings[classGroupings.length - 1];
    // This array is to keep track of what functions are overridden in
    // the child class; we assume they are overridden, but once we
    // find a class that doesn't override a parent function we set that
    // element to False
    let subCLfncs = [];
    let classTree;

    // Empty the analysisFile first in case anything has been written before
    /*
    fileN = analysisFileName + "_subClassOf_" + parentClass + ".txt";
    let d = "";
    fs.writeFile(fileN, d, (err) => {
    // In case of a error throw err.
    if (err) throw err;
    });
    */

    // Used to keep track of all the files we have accessed
    let listOfFiles = [];

    // Used to keep track of the children classes about which we've already
    // collected data
    let classesVisited = [];

    for (let i = 0; i < classGroupings.length; i++) {

        let f = classLocations[classGroupings[i]];

        if (f !== undefined) {
            f = f.split("\\")[(f.split("\\")).length - 1];
            f = f.split(".")[f.split(".").length - 2] + ".java";
            let filtered = xmlFiles.filter(d => d["filePath"].endsWith(f));
            if (filtered.length > 0)
                classTree = et.parse(filtered[0]["xml"]);
            if (filtered.length === 0) {
                console.log("file not found: ", f);
                continue;
            }
            f = classLocations[classGroupings[i]]
        } else {
            continue;
        }

        let attributes = [];
        let subCL = classTree.findall(".//class");
        let childName;

        let removeDuplicateMethod = (elem, pos) => {
            return attributes.indexOf(elem) === pos;
        };

        for (let j = 0; j < subCL.length; j++) {
            // Figure out what the child class's name is
            let chName = subCL[j].find("name");

            if (chName == null) {
                continue;
            }

            if (chName.text == null) {
                childName = (chName.find("name")).text
            } else {
                childName = chName.text;
            }
            // If we can't find a name, then we go on to the next class in
            // the srcML file
            if (childName === "") {
                continue;
            }

            // Each xml file might contain multiple classes, so just because
            // setInterval(function () {
            // is in the file, doesn't mean that it is the one that we want, so
            // we need to check that the filename is in classGroupings
            if (classGroupings.includes(childName) && !classesVisited.includes(childName)) {
                classesVisited.push(childName);

                if (parentInfo.get(parentClass) !== undefined) {

                    // This will contain a list of functions that are present in both
                    // the parent class and the child class.
                    let matchingFunctions;
                    if (parentClass !== childName) {

                        // First get a list of all the child functions
                        let fncs = subCL[j].findall("block/function");

                        for (let k = 0; k < fncs.length; k++) {
                            subCLfncs.push((fncs[k].find("name")).text);
                        }

                        subCLfncs.sort();

                        // Then see what functions are in common between the two lists;
                        // If there are matching functions, then matchingFunctions will
                        // contain their names.
                        matchingFunctions = subCLfncs.filter(element =>
                            (parentInfo.get(parentClass).functions).includes(element));

                        subCLfncs.length = 0;

                    }
                    // Come here and output attribute about parent functions matching
                    // Clear out matching functions here as well
                    if (matchingFunctions != null) {
                        for (let m = 0; m < matchingFunctions.length; m++) {

                            let name = "class overrides function of name \""
                                + matchingFunctions[m]
                                + "\" in parent class";

                            // Check if this attribute has been seen globally
                            if (!allAttributes.has(name)) {
                                attributes.push(allAttributes.get(name));
                            }
                            name = "";
                        }

                        matchingFunctions.length = 0;
                        matchingFunctions = [];

                    }
                }

                // Adds attributes having to do with the annotations above the class
                addClassAnnotations(subCL[j], attributes, allAttributes);

                // Adds attributes having to do with the constructors in the class
                addConstructors(subCL[j], attributes, allAttributes);

                // Adds attributes having to do with the member variables in the class
                addMemberVars(subCL[j], attributes, allAttributes);

                addImplementations(subCL[j], attributes, allAttributes);

                // Adds attributes about class visibility and class functions
                addClsFunctions(subCL[j], attributes, allAttributes);

                // Adds attributes created from search terms
                addParentChildRelationsExtra(subCL[j], attributes, allAttributes, searchTerms);

                // This is the file we will be outputting to
                let fileN = analysisFileName + "_subClassOf_" + parentClass + ".txt";

                // Output attributes found to database
                // Current FP Growth implementation will stop when it reads a newline
                // so we don't want it to output newlines when attributes is empty
                if (attributes.length > 0) {
                    // Remove duplicate elements from attributes
                    let finalList = attributes.filter(removeDuplicateMethod);

                    // By default the JavaScript sort() method will sort values as strings
                    // in alphabetical ascending order; if numbers are sorted as strings,
                    // then "6" is bigger than "542", so we have to supply a sort function
                    // that we define
                    // Sort the attributes we found in ascending order
                    finalList.sort((a, b) => a - b);

                    // Place the data in the map...
                    // If we already have an entry for this database, then we just
                    // append the new information
                    if (dataMap.has(fileN)) {
                        let entry = dataMap.get(fileN);

                        entry.push(finalList);
                        dataMap.set(fileN, entry);
                    }
                    // However, if we haven't yet had any entries for this database,
                    // then we just set this data as the first entry
                    else {
                        let entry = [];
                        entry[0] = finalList;
                        dataMap.set(fileN, entry);
                    }

                    /*
                   let stream = fs.createWriteStream(fileN, {flags:'a'});
                   stream.write(data);
                   stream.end();
                   */
                }

                attributes.length = 0;
                attributes = [];

                if (!listOfFiles.includes(f)) {
                    listOfFiles.push(f);
                }
            }
        }
    }// End of outermost for loop

    // Record that this file was used to contribute to this database
    let fileN = analysisFileName + "_subClassOf_" + parentClass + ".txt";
    let newStuff = listOfFiles.join("\n");
    fileAnalysisMap.set(fileN, newStuff);

};


/* addVisitedElements
 *
 * This function looks for attributes based off of a list of xPath queries
 * (based on cursor location) that are provided. If the visitedElement is found,
 * it is added as an attribute in the database for the class.
 *
 * Parameters:
 *  @allAttributes, map - map of all attributes that have been found in the
 *     code base
 *  @visitedElements, [xpath queries] - array of XPath queries representing
 *     elements of the code that have been visited by the user
 *  @classGroupings - represents the groups of classes that are analyzed for
 *     attributes together
 *  @analysisFileName - name of analysisFile
 *  @classLocations - to help get file names
 *  @parentInfo - contains information for all the parent classes that are
 *     needed in the analysis
 *  @fileAnalysisMap - map of files accessed in order to create the database
 *  @dataMap, Map - maps each class to its list of attributes that have been
 *     found
 *  @xmlFiles - list of XML files for each class, so that attributes can be
 *     searched
 *
*/
export const addVisitedElements = (allAttributes, visitedElements, classGroupings,
                                   analysisFileName, classLocations,
                                   parentInfo, /*fileAnalysisMap,*/ dataMap, xmlFiles) => {

    let parentClass = classGroupings[classGroupings.length - 1];
    let classTree;

    // Used to keep track of the children classes about which we've already
    // collected data
    let classesVisited = [];

    // Used to keep track of all the files we have accessed
    let listOfFiles = [];

    let index = 0;

    for (let i = 0; i < classGroupings.length; i++) {

        let f = classLocations[classGroupings[i]];

        if (f !== undefined) {
            f = f.split("\\")[(f.split("\\")).length - 1];
            f = f.split(".")[f.split(".").length - 2] + ".java";

            // let data = fs.readFileSync(f).toString();
            // classTree = et.parse(data);

            let filtered = xmlFiles.filter(d => d["filePath"].endsWith(f));
            if (filtered.length > 0)
                classTree = et.parse(filtered[0]["xml"]);
            if (filtered.length === 0) {
                console.log("file not found: ", f);
                continue;
            }
        } else {
            continue;
        }

        let subCL = classTree.findall(".//class");
        let childName;

        for (let j = 0; j < subCL.length; j++) {

            // Figure out what the child class's name is
            let chName = subCL[j].find("name");

            if (chName == null) {
                continue;
            }

            if (chName.text == null) {
                childName = (chName.find("name")).text
            } else {
                childName = chName.text;
            }
            // If we can't find a name, then we go on to the next class in
            // the srcML file
            if (childName === "") {
                continue;
            }

            // Each xml file might contain multiple classes, so just because a class
            // is in the file, doesn't mean that it is the one that we want, so
            // we need to check that the filename is in classGroupings
            if (classGroupings.includes(childName) && !classesVisited.includes(childName)) {
                classesVisited.push(childName);

                // Get the list of attributes for this class
                let fileN = analysisFileName + "_subClassOf_" + parentClass + ".txt";
                let entry = (dataMap.get(fileN));

                // Go through each of the visitedElements. If the visitedElement is present
                // in this class, then add its attribute id to the list of attributes
                // for the class
                for (let k = 0; k < visitedElements.length; k++) {
                    let query = subCL[j].findall(visitedElements[k].featureXpath);

                    // If we found this visitedElement, then we add it to the list of
                    // attribute for this class
                    if (query != null && index < entry.length) {

                        if (allAttributes.has(visitedElements[k].featureDescription) &&
                            !entry[index].includes(allAttributes.get(visitedElements[k].featureDescription))) {

                            entry[index].push(allAttributes
                                .get(visitedElements[k].featureDescription));
                            dataMap.set(fileN, entry);
                            entry = dataMap.get(fileN);

                            if (!listOfFiles.includes(f)) {
                                listOfFiles.push(f);
                            }

                        }
                    }
                }
                // Increment index into set of entries for this database
                index++;
            }
        }
    }

    // // Record that this file was used to contribute to this database
    // let fileN = analysisFileName + "_subClassOf_" + parentClass + ".txt";
    // let newStuff = listOfFiles.join("\n");
    //
    // fileAnalysisMap.set(fileN, newStuff);

};

/* findVisitedElements
 *
 * This function looks for attributes based off of a list of xPath queries
 * (based on cursor location) that are provided. If the visitedElement is found,
 * it is added as an attribute in the general queryMap. It is also added to a
 * separate specialMap that contains only special attributes, such as those created
 * from search terms or custom queries.
 *
 * Parameters:
 *  @id_start, int - all attributes have a unique ID number; this value is the
 *     next available unique value for an attribute ID number
 *  @attributeList, Map - map of attribute RulePad descriptions to attribute
 *     ID's
 *  @queryMap, Map - map of all attributes query to attribute ID's
 *  @visitedElements, [xpath queries] - array of XPath queries representing
 *     elements of the code that have been visited by the user
 *  @specialMap, Map - map of special attribute queries to attribute ID's
 *
*/
export const findVisitedElements = (id_start, visitedElements, attributeList, queryMap, specialMap) => {

    for (let i = 0; i < visitedElements.length; i++) {

        if (!attributeList.has(visitedElements[i].featureDescription)) {

            attributeList.set(visitedElements[i].featureDescription, id_start.id);
            queryMap.set(visitedElements[i].featureXpath, id_start.id);
            specialMap.set(visitedElements[i].featureXpath, id_start.id);

            id_start.id += 1;
        }
    }
};


/* findParentChildRelationsExtra
 *
 * This function looks for attributes based off of a list of searchTerms that
 * are provided. If the searchTerm has an attribute that is found, it is added
 * as an attribute in the general queryMap. It is also added to a separate
 * specialMap that contains only special attributes, such as those created
 * from search terms or custom queries.
 *
 * Parameters:
 *  @id_start, int - all attributes have a unique ID number; this value is the
 *     next available unique value for an attribute ID number
 *  @attributeList, Map - map of attribute RulePad descriptions to attribute
 *     ID's
 *  @queryMap, Map - map of all attributes query to attribute ID's
 *  @searchTerms, Array of Arrays, [{file: xmlFile, searchTerms: [keyword1, keyword2]},
 *                     {file: xmlFile, searchTerms: [keyword1, keyword2]}] -
 *  @specialMap, Map - map of special attribute queries to attribute ID's
 *
*/
export const findParentChildRelationsExtra = (id_start, attributeList,
                                              queryMap, searchTerms, specialMap) => {

    /* For each searchTerm there are 3 different kinds of attributes that are
     * explored: one where the keyword is a class name, one where the keyword
     * is a function call, and one where the keyword is a member variable. */
    /* In order to properly search and perform all desired actions, there are
     * three different basic pieces of information for each attribute we create:
     * formal XML query, RulePad description, element API. This is the order of
     * the elements in the arrays for searchCandidates. Each array in
     * searchCandidates represents each of the kinds of attributes we wish
     * to explore for each keyword
     */
    let searchCandidates = [
        [".//src:class/src:name/text()=", "class with name ", ".//class/name"],
        [".//src:class/src:block/src:function/src:call/src:name/text()=",
            "class with function with name ", ".//class/block/function/call/name"],
        [".//src:class/src:block/src:decl_stmt/src:decl/src:name/text()=",
            "class with declaration statement with name ", ".//class/block/decl_stmt/decl/name"]];

    /* For each element in searchTerms...*/
    for (let i = 0; i < searchTerms.length; i++) {
        /* Parse the XML file */
        let classTree = et.parse(searchTerms[i]["file"]);

        /* For each keyword listed for the XML file...*/
        for (let j = 0; j < (searchTerms[i]["searchTerms"]).length; j++) {
            let keyword = "\"" + (searchTerms[i]["searchTerms"])[j] + "\"";

            /* There are 3 different combinations for the keyword that we
             * want to explore */
            for (let k = 0; k < searchCandidates.length; k++) {
                /* Create the XML Query*/
                let searchCommand = searchCandidates[k][0] + keyword;
                /* Create the RulePad description */
                let searchName = searchCandidates[k][1] + keyword;
                /* Use the API to search */
                let search = classTree.findall(searchCandidates[k][2]);

                /* If we find the search term at least once, then we add the
                 * search as a feature. */
                for (let m = 0; m < search; m++) {

                    if (search[m].text != null && search[m].text !== "" &&
                        search[m].text === keyword) {

                        if (!attributeList.has(searchName)) {

                            attributeList.set(searchName, id_start.id);
                            queryMap.set(searchCommand, id_start.id);
                            specialMap.set(searchCommand, id_start.id);

                            id_start.id += 1;
                        }
                    }
                }
            }
        }
    }
};
