const { CreateMode, Event } = require('node-zookeeper-client');
const serverVariables = require('../serverVariables');
// const zookeeper = require('./zooFunc');

const slaveRegistryZnode = '/registry_znode';

function createRegistryNode(zookeeper) {
    zookeeper.exists(slaveRegistryZnode, function (error, stat) {
        if (error) {
            console.log(error);
            return ;
        }
        if (stat) {
            console.log(stat)
            return stat;
        }

        zookeeper.create(slaveRegistryZnode, Buffer.from(''), CreateMode.PERSISTENT, function (error, path) {
            if (error) {
                console.log(error);
                return ;
            }
            console.log(`Node ${path} is created`);
            
        });
    });
}

function registerToCluster(zookeeper, metadata) {
    if (serverVariables.currentRegistryNode) {
        return 
    }

    const znodeModel = `${slaveRegistryZnode}/n_`;
    zookeeper.create(znodeModel, Buffer.from(metadata), CreateMode.EPHEMERAL_SEQUENTIAL, function (error, path) {
        if (error) {
            console.log('erorr 1', error);
            return
        }
        serverVariables.currentRegistryNode = path;
        console.log('Registered to cluster');
        // getAllAddresses()
        
    });
}

function unregisterFromCluster(zookeeper) {
    if (!serverVariables.currentRegistryNode) {
        return 
    }

    zookeeper.exists(serverVariables.currentRegistryNode, function (error, stat) {
        if (error) {
            console.log(error);
            return 
        }
        if (!stat) {
            return 
        }

        zookeeper.remove(serverVariables.currentRegistryNode, -1, function (error) {
            if (error) {
                console.log(error);
                return 
            }

            console.log(`Node ${serverVariables.currentRegistryNode} is removed`);
            serverVariables.currentRegistryNode = null;
            
        });
    });
}

function registerToUpdate(zookeeper) {
    updateAddresses(zookeeper)
}

function updateAddresses(zookeeper) {
    serverVariables.slaves = [];
    zookeeper.getChildren(slaveRegistryZnode, (event) => {
        if (event.getType() === Event.NODE_CHILDREN_CHANGED) {
            console.log('Some child node state changed')
            updateAddresses(zookeeper)
        }
    },function (error, children, stats) {
        if (error) {
            console.log(`Error: ${error}`);
            return;
        }

        let completed = 0;
        children.sort()
        const smallestChild = children[0]
        children.forEach((regChild) => {
            if( serverVariables.currentRegistryNode.endsWith(smallestChild) ){
                serverVariables.role = 'master'
                serverVariables.slaves = {...children}.filter( child => {!child.endsWith(smallestChild) })
                console.log('I am the master')
                console.log('slaves are: ', serverVariables.slaves)
            }else{
                
            }
            const znodeFullPath = `${slaveRegistryZnode}/${regChild}`;
            zookeeper.getData(znodeFullPath, function (error, data, stat) {
                if (error) {
                    console.log('error 1: ',error);
                } else { 
                    const address = data.toString();
                    console.log(`Got address ${address}`);
                    serverVariables.slaves.push(address);

                    completed++;
                    if (completed === children.length) {
                        console.log('All addresses updated:', serverVariables.slaves);
                    }
                }
            })
        })
    });
}

function getAllAddresses(zookeeper) {
    if (!serverVariables.slaves || serverVariables.slaves.length === 0) {
        updateAddresses(zookeeper);
    }
    console.log('slaves: ', serverVariables.slaves)
    return serverVariables.slaves;
}

module.exports = {
    createRegistryNode,
    registerToCluster,
    unregisterFromCluster,
    updateAddresses,
    getAllAddresses,
    registerToUpdate
};