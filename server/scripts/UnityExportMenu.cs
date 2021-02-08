using System;
using System.IO;
using System.Linq;
using UnityEngine;
using UnityEditor;
using USD.NET;
using USD.NET.Unity;
using System.Dynamic;

// Example Unity script for exporting USDZ.
// Reads input from command line and can be hardcoded to test from in-app menu.

public class MenuItems : MonoBehaviour
{
    [MenuItem("Tools/USDZ Export")]
    static void MenuExportSelectedAsUsdz()
    {
        string[] args = System.Environment.GetCommandLineArgs();
        string input = "";
        string outputPath = "";

        // Parse command line arguments
        for (int i = 0; i < args.Length; i++)
        {
            //Debug.Log("ARG " + i + ": " + args[i]);
            if (args[i] == "-inputFile")
            {
                input = args[i + 1];
            }
            else if (args[i] == "-outputPath")
            {
                outputPath = args[i + 1];
            }
        }

        // Hard-coded relative resource path. Files must be under assets directory to be processed.
        string meshResourcePath = string.Format("Assets/Resources/" + input);

        // Load and instantiate game object
        GameObject GO = AssetDatabase.LoadAssetAtPath(meshResourcePath, typeof(GameObject)) as GameObject;
        GameObject GOclone = GameObject.Instantiate(GO, Vector3.zero, Quaternion.Euler(0, 180, 0));
        GOclone.name = GO.name;

        // Select object
        Selection.activeGameObject = GOclone;

        // Create and validate output path
        var filename = Path.GetFileNameWithoutExtension(input);
        var filePath = string.Format(outputPath + "\\" + filename + ".usdz");

        if (filePath == null || filePath.Length == 0)
        {
            return;
        }

        var fileDir = Path.GetDirectoryName(filePath);

        if (!Directory.Exists(fileDir))
        {
            var di = Directory.CreateDirectory(fileDir);
            if (!di.Exists)
            {
                Debug.LogError("Failed to create directory: " + fileDir);
                return;
            }
        }

        // generate usdz
        Unity.Formats.USD.UsdzExporter.ExportUsdz(filePath, Selection.activeGameObject);

        // cleanup resource folder
        string[] deletePaths = Directory.GetFiles(Application.dataPath + "\\Resources");
        foreach (string deletePath in deletePaths)
            File.Delete(deletePath);
    }
}