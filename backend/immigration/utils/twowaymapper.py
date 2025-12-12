class TwoWayMapping:
    def __init__(self, initial_mapping):
        # Initialize the forward and reverse mappings
        self.forward_map = initial_mapping
        self.reverse_map = {v: k for k, v in initial_mapping.items()}

    def get(self, key):
        # Try to get the corresponding value from forward_map
        if key in self.forward_map:
            return self.forward_map[key]
        # Try to get the corresponding value from reverse_map
        elif key in self.reverse_map:
            return self.reverse_map[key]
        else:
            raise KeyError(f"Key '{key}' not found in either mapping.")

    def get_forward(self, key):
        # Try to get the corresponding value from forward_map
        if key in self.forward_map:
            return self.forward_map[key]
        else:
            raise KeyError(f"Key '{key}' not found in either mapping.")

    def get_reverse(self, key):
        # Try to get the corresponding value from reverse_map
        if key in self.reverse_map:
            return self.reverse_map[key]
        else:
            raise KeyError(f"Key '{key}' not found in either mapping.")

    def add_mapping(self, key, value):
        # Add a new mapping to both forward and reverse maps
        self.forward_map[key] = value
        self.reverse_map[value] = key

    def remove_mapping(self, key):
        # Remove a mapping from both forward and reverse maps
        if key in self.forward_map:
            value = self.forward_map.pop(key)
            self.reverse_map.pop(value)
        elif key in self.reverse_map:
            value = self.reverse_map.pop(key)
            self.forward_map.pop(value)
        else:
            raise KeyError(f"Key '{key}' not found in either mapping.")
