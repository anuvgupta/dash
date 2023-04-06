service mysql stop
service apache2 start
pm2 start /home/ubuntu/nodejs-apps/ecosystem.json
pm2 start /home/ubuntu/pocketjs-apps/ecosystem.json
mongod --config=/home/ubuntu/nodejs-apps/nestor/mongodb/mongo-prod.conf --fork
