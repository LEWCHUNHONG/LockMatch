provider "azurerm" {
  features {}
}

# Create Resource Group
resource "azurerm_resource_group" "main" {
  name     = var.resource_group_name
  location = var.location
}

# Create Virtual Network
resource "azurerm_virtual_network" "main" {
  name                = "nodejs-vnet"
  address_space       = ["10.0.0.0/16"]
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
}

# Create Subnet
resource "azurerm_subnet" "main" {
  name                 = "nodejs-subnet"
  resource_group_name  = azurerm_resource_group.main.name
  virtual_network_name = azurerm_virtual_network.main.name
  address_prefixes     = ["10.0.1.0/24"]
}

# Create Public IP
resource "azurerm_public_ip" "main" {
  name                = "nodejs-vm-ip"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  allocation_method   = "Dynamic"
  sku                 = "Basic"
}

# Create Network Interface
resource "azurerm_network_interface" "main" {
  name                = "nodejs-nic"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name

  ip_configuration {
    name                          = "internal"
    subnet_id                     = azurerm_subnet.main.id
    private_ip_address_allocation = "Dynamic"
    public_ip_address_id          = azurerm_public_ip.main.id
  }
}

# Create Linux Virtual Machine (Ubuntu for cost-effectiveness)
resource "azurerm_linux_virtual_machine" "main" {
  name                = var.vm_name
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  size                = var.vm_size
  
  admin_username      = var.admin_username
  network_interface_ids = [azurerm_network_interface.main.id]

  admin_ssh_key {
    username   = var.admin_username
    public_key = file("~/.ssh/id_rsa.pub")  # Replace with your SSH public key path
  }

  os_disk {
    caching              = "ReadWrite"
    storage_account_type = "Standard_LRS"
  }

  source_image_reference {
    publisher = "Canonical"
    offer     = "0001-com-ubuntu-server-jammy"
    sku       = "22_04-lts"
    version   = "latest"
  }

  # Custom data script for initial setup
  custom_data = filebase64("${path.module}/scripts/setup-vm.sh")
}

# Create Network Security Group
resource "azurerm_network_security_group" "main" {
  name                = "nodejs-nsg"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name

  security_rule {
    name                       = "SSH"
    priority                   = 1001
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "22"
    source_address_prefix      = "*"
    destination_address_prefix = "*"
  }

  security_rule {
    name                       = "HTTP"
    priority                   = 1002
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "80"
    source_address_prefix      = "*"
    destination_address_prefix = "*"
  }

  security_rule {
    name                       = "HTTPS"
    priority                   = 1003
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "443"
    source_address_prefix      = "*"
    destination_address_prefix = "*"
  }

  security_rule {
    name                       = "NodeJS"
    priority                   = 1004
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "3000"
    source_address_prefix      = "*"
    destination_address_prefix = "*"
  }

  security_rule {
    name                       = "MySQL"
    priority                   = 1005
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "3306"
    source_address_prefix      = "*"
    destination_address_prefix = "*"
  }
}

# Associate NSG with NIC
resource "azurerm_network_interface_security_group_association" "main" {
  network_interface_id      = azurerm_network_interface.main.id
  network_security_group_id = azurerm_network_security_group.main.id
}

# Create Container Group for MySQL
resource "azurerm_container_group" "mysql" {
  name                = "mysql-container"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  ip_address_type     = "Private"
  os_type             = "Linux"
  restart_policy      = "Always"

  container {
    name   = "mysql"
    image  = "mysql:8.0"
    cpu    = "1"
    memory = "2"

    ports {
      port     = 3306
      protocol = "TCP"
    }

    environment_variables = {
      MYSQL_ROOT_PASSWORD = var.mysql_password
      MYSQL_DATABASE      = "appdb"
      MYSQL_USER          = "appuser"
      MYSQL_PASSWORD      = "apppassword"
    }

    volume {
      name                 = "mysql-data"
      mount_path           = "/var/lib/mysql"
      storage_account_name = azurerm_storage_account.container_storage.name
      storage_account_key  = azurerm_storage_account.container_storage.primary_access_key
      share_name           = azurerm_storage_share.mysql_share.name
    }
  }
}

# Storage Account for MySQL data persistence
resource "azurerm_storage_account" "container_storage" {
  name                     = "mysqlstorage${random_string.random.result}"
  resource_group_name      = azurerm_resource_group.main.name
  location                = azurerm_resource_group.main.location
  account_tier             = "Standard"
  account_replication_type = "LRS"
}

resource "azurerm_storage_share" "mysql_share" {
  name                 = "mysqlshare"
  storage_account_name = azurerm_storage_account.container_storage.name
  quota                = 50
}

resource "random_string" "random" {
  length  = 8
  special = false
  upper   = false
}

# Output VM Public IP
output "vm_public_ip" {
  value = azurerm_public_ip.main.ip_address
  description = "Public IP address of the VM"
}

output "mysql_connection_string" {
  value = "mysql://root:${var.mysql_password}@${azurerm_container_group.mysql.ip_address}:3306/appdb"
  sensitive = true
}