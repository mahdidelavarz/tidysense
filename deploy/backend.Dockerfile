# Build context: the repository root.
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY global.json ./
COPY backend/TidySense.csproj backend/
RUN dotnet restore backend/TidySense.csproj
COPY backend/ backend/
# The OpenAPI document is a build-time artifact of development; generating it would start the application here.
RUN dotnet publish backend/TidySense.csproj --configuration Release --no-restore --output /app \
    -p:OpenApiGenerateDocuments=false -p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app
COPY --from=build /app ./
ENV ASPNETCORE_ENVIRONMENT=Production \
    ASPNETCORE_HTTP_PORTS=8080
EXPOSE 8080
# The image's unprivileged user.
USER $APP_UID
ENTRYPOINT ["dotnet", "TidySense.dll"]
