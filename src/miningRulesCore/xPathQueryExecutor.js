import {nsResolver} from "../core/coreConstants";

/**
 *
 * @param mainNode {string|Node}
 * @param xPath {string}
 * @return {Node[]}
 */
export const returnNodeArray = (mainNode, xPath) => {
    const NodesIterator = returnNodeIterator(mainNode, xPath);
    if (NodesIterator === -1) return [];
    const nodeArray = [];
    if (NodesIterator.resultType !== 4) {
        return [];
    }
    let res = NodesIterator.iterateNext();
    while (res !== null) {
        nodeArray.push(res);
        res = NodesIterator.iterateNext();
    }
    return nodeArray;
};


/**
 *
 * @param mainNode {string|Node}
 * @param xPath {string}
 * @return {number|XPathResult}
 */
export const returnNodeIterator = (mainNode, xPath) => {
    const parser = new DOMParser();
    let parentNodeStrings = "";
    if (typeof mainNode === "object") {
        parentNodeStrings = new XMLSerializer().serializeToString(mainNode);
    } else if (typeof mainNode === "string") {
        parentNodeStrings = mainNode;
    } else {
        return -1;
    }
    const parentNodeCopy = parser.parseFromString(parentNodeStrings, "text/xml");
    return parentNodeCopy.evaluate(xPath, parentNodeCopy, nsResolver, XPathResult.ANY_TYPE, null);
};


/**
 * aux method for running XPath when no node is queried
 * @param mainNode
 * @param xPath
 * @return {boolean} whether the node exists
 */
export const runXPathNoNode = (mainNode, xPath) => {
    const parentNodes = returnNodeIterator(mainNode, xPath);
    const res = parentNodes.iterateNext();
    return (res !== null);
};

/**
 * aux method for running XPath when one node is queried
 * @param mainNode
 * @param xPath may end with text() or a node
 * @return {string[]} array of found nodes (as text())
 */
export const runXPathSingleNode = (mainNode, xPath) => {
    const result = [];
    const parentNodes = returnNodeIterator(mainNode, xPath);
    let res = parentNodes.iterateNext();
    while (res !== null) {
        result.push(res.nodeValue);
        res = parentNodes.iterateNext();
    }
    return result;
};


/**
 * aux method for running XPath when one node is queried
 * @param mainNode {Node}
 * @param xPath may end with text() or a node
 * @return {string[]} array of found nodes (as text())
 */
export const runXPathSingleNodeAndChildren = (mainNode, xPath) => {
    const result = [];
    const parentNodes = returnNodeIterator(mainNode, xPath);
    let res = parentNodes.iterateNext();
    while (res !== null) {
        result.push(extractTextFromXML(res));
        res = parentNodes.iterateNext();
    }
    return result;
};

/**
 * aux method for running XPath when several nodes (co-occurring) are queried
 * @param mainNode
 * @param xPath may end with text() or a node
 * @param nodes
 * @return {*[]} arrays of arrays of co-occurring nodes
 */
export const runXPathMultipleNodes = (mainNode, xPath, nodes) => {
    const result = [];
    const parentNodes = returnNodeIterator(mainNode, xPath);
    let res = parentNodes.iterateNext();
    while (res) {
        try {
            const parser = new DOMParser();
            const resString = new XMLSerializer().serializeToString(res);
            const resCopy = parser.parseFromString(resString, "text/xml");
            const tempResult = [];
            for (let i = 0; i < nodes.length; i++) {
                const childNode = resCopy.evaluate(nodes[i], resCopy, nsResolver, XPathResult.ANY_TYPE, null);
                const child = (childNode.iterateNext()).nodeValue;
                tempResult.push(child);
            }
            result.push(tempResult);
        } catch (e) {
            // failed to add all nodes of xPath
        }
        try {
            res = parentNodes.iterateNext();
        } catch (e) {
            break;
        }
    }
    return result;
};

/**
 * aux method for running XPath when several nodes (co-occurring) are queried
 * @param mainNode
 * @param xPath may end with text() or a node
 * @param nodes
 * @return {*[]} arrays of arrays of co-occurring nodes
 */
export const runXPathMultipleNodesAndChildren = (mainNode, xPath, nodes) => {
    const result = [];
    const parentNodes = returnNodeIterator(mainNode, xPath);
    let res = parentNodes.iterateNext();
    while (res) {
        try {
            const parser = new DOMParser();
            const resString = new XMLSerializer().serializeToString(res);
            const resCopy = parser.parseFromString(resString, "text/xml");
            const tempResult = [];
            for (let i = 0; i < nodes.length; i++) {
                const childNode = resCopy.evaluate(nodes[i], resCopy, nsResolver, XPathResult.ANY_TYPE, null);
                const child = extractTextFromXML(childNode.iterateNext());
                tempResult.push(child);
            }
            result.push(tempResult);
        } catch (e) {
            // failed to add all nodes of xPath
        }
        try {
            res = parentNodes.iterateNext();
        } catch (e) {
            break;
        }
    }
    return result;
};

/**
 * returns the text of an XML node
 * @param xmlNode
 * @return {string}
 */
function extractTextFromXML(xmlNode) {
    function traverse(node) {
        let text = "";
        for (let i = 0; i < node.childNodes.length; i++) {
            const childNode = node.childNodes[i];
            if (childNode.nodeType === Node.TEXT_NODE) {
                text += childNode.textContent;
            } else if (childNode.nodeType === Node.ELEMENT_NODE) {
                text += traverse(childNode);
            }
        }
        return text;
    }
    return traverse(xmlNode);
}
