###########################################
# Dockerfile to build an ASP.NET Core website
###########################################
# Base image is dotnet
FROM microsoft/dotnet:latest
# Author: robymes
MAINTAINER robymes <robymes@gmail.com>
COPY . /app
WORKDIR /app
 
RUN ["dotnet", "restore"]
RUN ["dotnet", "build"]
 
EXPOSE 5000/tcp
ENV ASPNETCORE_URLS http://*:5000
 
ENTRYPOINT ["dotnet", "run"]