/**
 * Created by saharmehrpour on 9/7/17.
 */


import React, {Component} from 'react';
// import ReactDOM from 'react-dom';
import '../App.css';
// import Utilities from '../core/utilities';

import * as d3 from 'd3';
import PubSub from 'pubsub-js';

import {SplitButton, MenuItem, Button} from 'react-bootstrap';


export class ProjectHierarchy extends Component {

    constructor() {
        super();
        this.state = {projectHierarchyJson: {}, dropDowns: []};
        this.attachListener();
    }

    render() {
        return (
            <div id="projectHierarchyDropDownDiv">
                {/*{this.drawDropDowns()}*/}
            </div>
        )
    }

    /**
     * subscribe for events
     */
    attachListener() {

        // [hash, value]
        PubSub.subscribe('HASH', (msg, data) => {
            d3.select('#projectHierarchy').classed('hidden', () => {
                return (['hierarchy'].indexOf(data[0]) === -1 )
            });
        });

        // [projectHierarchyJson]
        PubSub.subscribe('PROJECT_HIERARCHY', (msg, data) => {
            this.setState({projectHierarchyJson: data[0], dropDowns: [{itemData: data[0]}]});
        });
    }


    drawDropDowns() {
        return this.state.dropDowns.map((myData, i) => {
            if (myData['itemData'].hasOwnProperty('children'))
                return (
                    <div key={i} style={{float: "left"}}>
                        <SplitButton bsStyle="default" title={myData['itemData']['properties']['name']} id="test"
                                     onSelect={(evt) => this.updateDropDownList(evt)}
                                     onClick={() => {
                                         this.updateDropDownList(myData['itemData']['properties']['canonicalPath'])
                                     }}>

                            {/* filter directory children */}
                            {myData['itemData']['children']
                                .filter((d) => {
                                    return d['properties']['isDirectory']
                                })
                                .map((child, i) => {
                                    return (
                                        <MenuItem
                                            eventKey={child['properties']['canonicalPath']}
                                            key={i}>{child['properties']['name']}</MenuItem>
                                    )
                                })}

                            <MenuItem divider/>

                            {/* filter normal file children */}
                            {myData['itemData']['children']
                                .filter((d) => {
                                    return !d['properties']['isDirectory']
                                })
                                .map((child, i) => {
                                    return (
                                        <MenuItem
                                            eventKey={child['properties']['canonicalPath']}
                                            key={i}>{child['properties']['name']}</MenuItem>
                                    )
                                })}
                        </SplitButton>
                    </div>
                );
            else
                return (
                    <div key={i} style={{float: "left"}}>
                        <Button onClick={() => {
                            this.dropDownOnSelect(myData['data']['properties']['canonicalPath'])
                        }}>
                            {myData['itemData']['properties']['name']}
                        </Button>
                    </div>
                );

        })

    }

    /**
     * update the array for keeping the name of selected elements in drop-downs
     * @param canonicalPath: canonicalPath of the selected item
     */
    updateDropDownList(canonicalPath) {

        console.log(canonicalPath);

        let parent = canonicalPath.slice(0);
        parent = parent.substring(0, parent.lastIndexOf('/'));

        // find the node of the parent
        let indexToKeep = 0;
        this.state.dropDowns.filter((d, i) => {
            if (d['itemData']['properties']['canonicalPath'] === parent) {
                indexToKeep = i;
            }
            return i;
        });

        // remove i+1 to end
        let clonedArray = this.state.dropDowns.slice(0);
        while (indexToKeep < clonedArray.length - 1)
            clonedArray.splice(indexToKeep + 1, clonedArray.length - indexToKeep - 1);

        // find the node of the new selection among children of the parent
        let newData = this.state.dropDowns[indexToKeep]['itemData']['children'].filter((d, i) => d['properties']['canonicalPath'] === canonicalPath)[0];
        clonedArray.push({itemData: newData});

        this.setState({dropDowns: clonedArray});

        // do magic!

    }


    /**
     * onSelect method
     * @param evt: eventKey in MenuItem
     */
    dropDownOnSelect(evt) {

        console.log(evt, "select");

        let nameParent = evt.split(',');
        if (nameParent.length > 1) {
            this.updateDropDownList(nameParent[0], nameParent[1]);
            // do magic!
        }
        else {
            // do magic!
        }
    }


}


export default ProjectHierarchy;