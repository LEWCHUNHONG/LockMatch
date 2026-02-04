variable "resource_group_name" {
  default = "nodejs-app-rg"
}

variable "location" {
  default = "eastus"
}

variable "vm_size" {
  default = "Standard_B1s"  # Cheapest VM tier
}

variable "admin_username" {
  default = "azureuser"
}

variable "vm_name" {
  default = "nodejs-app-vm"
}

variable "mysql_password" {
  type      = string
  sensitive = true
}

variable "github_repo" {
  default = "LEWCHUNHONG/LockMatch.git"
}