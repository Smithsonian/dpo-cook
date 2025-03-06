inputFile = Wscript.Arguments(0)
mtlLibName = Wscript.Arguments(1)
doForce = Wscript.Arguments(2)
tempFileName = "temp"

Set FSO = CreateObject("Scripting.FileSystemObject")
Set file = FSO.OpenTextFile(inputFile, 1)
Set outFile = FSO.OpenTextFile(tempFileName, 2, True)

newMtlLib = "mtllib " & mtlLibName
newMtl = "usemtl ml"

If doForce Then
    outFile.WriteLine newMtlLib
    outFile.WriteLine newMtl
End If

Do Until file.AtEndOfStream
    current = file.ReadLine
    If InStr(current, "mtllib") > 0 Then
        If NOT(doForce) Then
            outFile.WriteLine newMtlLib
		    outFile.WriteLine newMtl
        End If
    ElseIf InStr(current, "usemtl") > 0 Then
         
    Else
        outFile.WriteLine current
    End If
Loop

file.Close
outFile.Close

FSO.CopyFile tempFileName, inputFile, True
FSO.DeleteFile tempFileName