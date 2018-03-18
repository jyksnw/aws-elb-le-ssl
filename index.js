'use strict'

import Pledge from 'bluebird'
import handler from './handler'

const updateCertificate = (data, callback) => {
  return new Pledge((resolve, reject) => {
    handler.update_certificate(data, null, (err, status) => {
      if (err) {
        callback ? callback(err, null) : reject(err)
      } else {
        callback ? callback(null, status) : resolve(status)
      }
    })
  })
}

module.exports = updateCertificate

if (require.main === module) {
  const event = {
    Records: [{
      Sns: {
        Message: JSON.stringify({
          domain: '',
          arn: ''
        })
      }
    }]
  }

  updateCertificate(event)
    .then(console.log)
    .catch(console.warn)
}
