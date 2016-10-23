docker network create --driver overlay mainnetwork
docker service create --name rabbitmq_bus --network mainnetwork --publish 15672:15672 rabbitmq:3.6.5-management