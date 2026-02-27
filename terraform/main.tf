resource "aws_ecr_repository" "farmpro" {
  name = "farmpro"
  image_scanning_configuration {
    scan_on_push = true
  }
  tags = {
    Project = "FarmPro"
  }
}

output "ecr_repository_url" {
  value = aws_ecr_repository.farmpro.repository_url
}
