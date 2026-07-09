run:
	dotnet run --project ./src/ECommerce.Api

apiadd:
	dotnet add ./src/ECommerce.Api/ECommerce.Api.csproj package $(pkg)

appadd:
	dotnet add ./src/ECommerce.Application/ECommerce.Application.csproj package $(pkg)

infadd:
	dotnet add ./src/ECommerce.Infrastructure/ECommerce.Infrastructure.csproj package $(pkg)

db-up:
	docker compose up -d ecommerce-db

db-logs:
	docker compose logs -f ecommerce-db

db-down:
	docker compose down