docker network create --driver overlay mainnetwork
docker service create --name rabbitmq_bus --network mainnetwork --publish 15672:15672 rabbitmq:3.6.5-management
docker service create --name mongo --network mainnetwork --publish 27017:27017 mongo:3.2
docker service create --name node_ingestion --network mainnetwork --publish 8080:8080 robymes/node_ingestion:latest
docker service create --name node_processing --network mainnetwork robymes/node_processing:latest
docker service create --name aspnet_web --network mainnetwork --publish 80:5000 robymes/aspnet_web:latest