import csv

def url():
    ans = []
    with open("Songs.csv", newline='', encoding="utf-8") as file:
        reader = csv.DictReader(file)

        for row in reader:
            track_id = row["Spotify Track Id"]
            full_url = f"https://open.spotify.com/track/{track_id}"
            ans.append(full_url)

    return ans