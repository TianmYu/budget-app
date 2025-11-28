import os
import re

# Paths
env_file = ".env"
compose_file = "compose.yml"
output_file = "compose.p.yml"

# Step 1: Load .env variables into a dictionary
env_vars = {}
with open(env_file) as f:
    for line in f:
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        if "=" not in line:
            continue
        key, value = line.split("=", 1)
        value = value.strip().strip('"').strip("'")  # remove quotes if any
        env_vars[key] = value

# Step 2: Read the docker-compose.yml file
with open(compose_file) as f:
    compose_content = f.read()

# Step 3: Substitute ${VAR} with the corresponding value
pattern = re.compile(r'\$\{(\w+)\}')  # matches ${VAR_NAME}

def replacer(match):
    var_name = match.group(1)
    return env_vars.get(var_name, match.group(0))  # keep original if not found

processed_content = pattern.sub(replacer, compose_content)

# Step 4: Write to the processed output file
with open(output_file, "w") as f:
    f.write(processed_content)

print(f"Processed Compose file written to {output_file}")