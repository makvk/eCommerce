.PHONY: run apiadd appadd infadd db-up db-logs db-down seed-products

run:
	make db-down
	make db-up
	dotnet run --project ./src/ECommerce.Api

apiadd:
	dotnet add ./src/ECommerce.Api/ECommerce.Api.csproj package $(pkg)

appadd:
	dotnet add ./src/ECommerce.Application/ECommerce.Application.csproj package $(pkg)

infadd:
	dotnet add ./src/ECommerce.Infrastructure/ECommerce.Infrastructure.csproj package $(pkg)

db-up:
	docker compose up -d ecommerce-db ecommerce-cache ecommerce-minio

db-logs:
	docker compose logs -f ecommerce-db

db-down:
	docker compose down

# Нужен запущенный API (DEBUG) + MinIO. Скачивает фото с Unsplash и кладёт в MinIO.
seed-products:
	node ./scripts/seed-products.mjs http://localhost:5269
