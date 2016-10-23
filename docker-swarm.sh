docker network create --driver overlay main_network
docker service create --name rabbitmq_bus --network main_network --publish 15672:15672 rabbitmq:3.6.5-management