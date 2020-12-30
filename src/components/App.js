import FileSync from '../abis/FileSync.json'
import React, { Component } from 'react';
import Navbar from './Navbar'
import Main from './Main'
import Web3 from 'web3';
import './App.css';

//Declare IPFS
const ipfsClient = require('ipfs-http-client')
const ipfs = ipfsClient({ host: 'ipfs.infura.io', port: 5001, protocol: 'https' }) // leaving out the arguments will default to these values


class App extends Component {

  async componentWillMount() {
    await this.loadWeb3()
    await this.loadBlockchainData()
  }

  async loadWeb3() {
    //setting up web3
    if (window.ethereum) {
      window.web3 = new Web3(window.ethereum)
      await window.ethereum.enable()
    }
    else if (window.web3) {
      window.web3 = new Web3(window.web3.currentProvider)
    }
    else {
      window.alert('Non-Ethereum browser detected. You should consider trying MetaMask!')
    }
  }

  async loadBlockchainData() {
    //Declare Web3
      const web3 = window.web3
      console.log(web3)
    //Load account
      const accounts = await web3.eth.getAccounts()
      this.setState({account: accounts[0]})


    // Network ID
    const networkId = await web3.eth.net.getId()
    const networkData = FileSync.networks[networkId]
    if(networkData) {
      // Assign contract
      const fileSync = new web3.eth.Contract(FileSync.abi, networkData.address)
      this.setState({ fileSync })
      // Get files amount
      const filesCount = await fileSync.methods.fileCount().call()
      this.setState({ filesCount })
      // Load files&sort by the newest
      for (var i = filesCount; i >= 1; i--) {
        const file = await fileSync.methods.files(i).call()
        this.setState({
          files: [...this.state.files, file]
        })
      }
    } else {
      window.alert('FileSync contract not deployed to detected network.')
    }
  }

  // Get file from user
  captureFile = event => {
    event.preventDefault()

    const file = event.target.files[0] //get file from form field 
    const reader = new window.FileReader()

    reader.readAsArrayBuffer(file) //convert to buffer format we need for IPFS 
    reader.onloadend = () => {
      this.setState({
        buffer: Buffer(reader.result),
        type: file.type,
        name: file.name
      })
      console.log('buffer', this.state.buffer)
    }
  }


  //Upload File
  uploadFile = description => {
    console.log('Submitting file to IPFS')
    //Add file to the IPFS
ipfs.add(this.state.buffer,(error,result)=>{
  console.log('IPFS result', result)

        //Check If error
        if(error){
    console.error(error)
    return  //Return error
  }
  this.setState({loading:true}) //Set state to loading

  // Assign value for the file without extension
  if(this.state.type === ''){
    this.setState({type: 'none'})
  }

  //call smart contract uploaf file function
  this.state.fileSync.methods.uploadFile(result[0].hash, result[0].size, this.state.type, this.state.name, description).send({ from: this.state.account }).on('transactionHash', (hash) => {
    this.setState({
     loading: false,
     type: null,
     name: null
   })
   window.location.reload()
  }).on('error', (e) =>{
    window.alert('Error')
    this.setState({loading: false})
  })
})
}

  //Set states
  constructor(props) {
    super(props)
    this.state = {
      account: '',
      fileSync: null,
      files: [],
      loading:false,
      type:null,
      name:null
    }

    //Bind functions
  }

  render() {
    return (
      <div>
        <Navbar account={this.state.account} />
        { this.state.loading
          ? <div id="loader" className="text-center mt-5"><p>Loading...</p></div>
          : <Main
              files={this.state.files}
              captureFile={this.captureFile}
              uploadFile={this.uploadFile}
            />
        }
      </div>
    );
  }
}

export default App;