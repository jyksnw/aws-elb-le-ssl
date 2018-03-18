'use strict'

import AWS from 'aws-sdk'
import Pledge from 'bluebird'

// Load in development variables
if (process.env.NODE_ENV !== 'production') {
  require('dotyaml')()
}

// Set the AWS_REGION for local testing
if (!process.env.AWS_REGION) {
  process.env.AWS_REGION = 'us-east-1'
}

AWS.config.setPromisesDependency(Pledge)
const elb = new AWS.ELB({ region: process.env.AWS_REGION })

const ELB_NAME = process.env.ELB_NAME
const ELB_PORT = process.env.ELB_PORT || 443
const ELB_CNAME = process.env.ELB_CNAME

const checkMessageAssociation = function (message) {
  return new Pledge((resolve, reject) => {
    if (message === undefined) {
      return reject(new Error('SNS message is not defined'))
    }

    if (message.domain === undefined || message.domain.trim() === '') {
      return reject(new Error('SNS message missing domain'))
    }

    if (message.arn === undefined || message.arn.trim() === '') {
      return reject(new Error('SNS message missing arn'))
    }

    return resolve(message.domain === ELB_CNAME)
  })
}

const setLoadBalancerListenerSSLCertificate = function (certificateArn) {
  return new Pledge((resolve, reject) => {
    const params = {
      LoadBalancerName: ELB_NAME,
      LoadBalancerPort: ELB_PORT,
      SSLCertificateId: certificateArn
    }

    elb.setLoadBalancerListenerSSLCertificate(params)
      .promise()
      .then(data => resolve(data))
      .catch(err => reject(err))
  })
}

module.exports.update_certificate = (event, context, callback) => {
  Pledge.all(event.Records.map(record => {
    let message = {}
    if (record.Sns && record.Sns.Message) {
      message = JSON.parse(record.Sns.Message)
    }

    checkMessageAssociation(message)
      .then(associated => {
        if (associated) {
          return setLoadBalancerListenerSSLCertificate(message.arn)
        } else {
          return Promise.resolve(`${message.domain} not associated with function`)
        }
      })
      .then((status) => Pledge.resolve(`Success: ${status}`))
      .catch(err => Pledge.reject(err))
  }))
    .then(status => callback(null, status))
    .catch(err => callback(err, null))
    .finally(() => console.log('Complete'))
}
