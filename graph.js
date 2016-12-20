import React from 'react'
const Node = require('libp2p-ipfs-browser').Node
const PeerInfo = require('peer-info')
const PeerId = require('peer-id')
const Multiaddr = require('multiaddr')
const P2PGraph = require('./p2p-graph.js')
const pullToStream = require('pull-stream-to-stream')
require('./style.css')

const PEER_CONNECTED = 'PEER_CONNECTED'
const PEER_DISCONNECTED = 'PEER_DISCONNECTED'

const PROTOCOL = '/libp2p.io/0.0.1'
const SIGNAL_SERVER = '/libp2p-webrtc-star/ip4/178.62.241.75/tcp/9090/ws/ipfs/:peer-id'
// Dev server
// const SIGNAL_SERVER = '/libp2p-webrtc-star/ip4/127.0.0.1/tcp/9090/ws/ipfs/:peer-id'

const startOwnPeer = (callback) => {
  PeerId.create((err, peerId) => {
    if (err) callback(err)
    const peerInfo = new PeerInfo(peerId)
    const mh1 = Multiaddr(SIGNAL_SERVER.replace(':peer-id', peerId.toB58String()))
    peerInfo.multiaddr.add(mh1)
    const node = new Node(peerInfo)
    node.start((err) => {
      if (err) callback(err)
      callback(null, node)
    })
  })
}
const listenAndConnectToPeers = (node, callback) => {
  node.discovery.on('peer', (peerInfo) => {
    node.dialByPeerInfo(peerInfo, () => {})
  })
  node.swarm.on('peer-mux-established', (peerInfo) => {
    callback(PEER_CONNECTED, peerInfo)
  })
  node.swarm.on('peer-mux-closed', (peerInfo) => {
    callback(PEER_DISCONNECTED, peerInfo)
  })
  // node.swarm.on('error', () => {
  //   callback(PEER_DISCONNECTED, connectPeerInfo)
  // })
}

const REMOVED_PEERS = []

export default class Graph extends React.Component {
  constructor (props) {
    super(props)
    this.state = {
      node: null,
      myId: '',
      peers: [],
      graph: null
    }
  }
  componentDidMount () {
    const graph = new P2PGraph('#graph')
    this.setState({graph})
    startOwnPeer((err, node) => {
      if (err) throw err
      const myId = node.peerInfo.id.toB58String()
      this.setState({node, myId})
      listenAndConnectToPeers(node, (type, peerInfo) => {
        const id = peerInfo.id.toB58String()
        if (type === PEER_CONNECTED && REMOVED_PEERS.indexOf(id) === -1 && this.state.peers.indexOf(id) === -1) {
          try {
            graph.add({
              id: id,
              name: id
            })
            graph.connect(myId, id)
          } catch (err) {
            // err
          }

          this.setState({peers: this.state.peers.concat([id])})

          ;(function connectPeer () {
            node.dialByPeerInfo(peerInfo, PROTOCOL, (err, conn) => {
              if (!err) {
                try {
                  graph.indicateConnect(myId, id)
                } catch (err) {
                  // err
                }
                const connStream = pullToStream(conn)
                const value = JSON.stringify({
                  from: myId,
                  peers: node.peerBook.getAll()
                })
                connStream.write(new Buffer(value))
                setImmediate(() => connStream.end())
              }
            })

            setTimeout(connectPeer, Math.floor(Math.random() * 5000) + 1000)
          })()
          return
        }
        if (type === PEER_DISCONNECTED) {
          node.peerBook.removeByB58String(id)
          REMOVED_PEERS.push(id)
          try {
            graph.disconnectAll(id)
            graph.remove(id)
          } catch (err) {
            // err
          }
        }
      })
      graph.add({
        id: myId,
        me: true,
        name: 'You'
      })

      node.handle(PROTOCOL, (protocol, conn) => {
        const connStream = pullToStream(conn)
        const peerCollection = []
        connStream.on('data', (data) => {
          peerCollection.push(data.toString())
        })
        connStream.on('end', () => {
          const fullCollection = JSON.parse(peerCollection.join(''))
          const fromId = fullCollection.from
          try {
            graph.indicateConnect(myId, fromId)
          } catch (err) {
            // err
          }
          const connectedPeers = Object.keys(fullCollection.peers).filter((id) => {
            return myId !== id
          })
          connectedPeers.forEach((id) => {
            try {
              this.state.graph.connect(fromId, id)
            } catch (err) {
              // err
            }
          })
        })
      })
    })
  }
  render () {
    return <div>
      <div id='graph' />
    </div>
  }
      // <div id='title'>lib<span id='blue'>p2p</span></div>
      // <div id='peers'><strong>Connected Peers</strong> ({this.state.peers.length})
      //   <br />
      //   {this.state.peers.concat([this.state.myId]).sort().map((peer) => <div>{peer}</div>)}
      // </div>
      // <div id='you'>
      //   Your ID:<br />{this.state.myId}
      // </div>
}
