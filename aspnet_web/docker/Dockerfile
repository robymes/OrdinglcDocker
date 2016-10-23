###########################################
# Dockerfile to build an ASP.NET Core website
###########################################
# Base image is aspnetcore 1.0
FROM microsoft/aspnetcore:1.0.1
# Author: robymes
MAINTAINER robymes <robymes@gmail.com>
# entry point
ENTRYPOINT ["dotet", "aspnet_web.dll"]
ARG source=/deploy
WORKDIR /app
EXPOSE 80
COPY $source .